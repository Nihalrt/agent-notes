import os
import re
import uuid
import math
from io import BytesIO
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import (
    create_engine, Column, String, Text, DateTime, JSON, desc, select, text,
)
from sqlalchemy.orm import sessionmaker, declarative_base
from google import genai
from google.genai import types as genai_types
from PIL import Image, ImageDraw

load_dotenv()  # picks up backend/.env locally; Vercel supplies deployment variables

# 1. LLM CONFIGURATION — Gemini's free tier (no credit card required, just a
# Google account at aistudio.google.com/apikey). Uses the current
# `google-genai` SDK — the older `google-generativeai` package (and its
# text-embedding-004 model) are both deprecated.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Get a free key at "
        "https://aistudio.google.com/apikey and put it in backend/.env "
        "(GEMINI_API_KEY=...) for local development, or in your Vercel project variables."
    )
genai_client = genai.Client(api_key=GEMINI_API_KEY)
GENERATION_MODEL = "gemini-2.5-flash"


def run_gemini_agent(system_instruction: str, user_prompt: str) -> str:
    """Call Gemini once with a system role + a task prompt, and return the text.

    This replaces CrewAI's Agent/Task/Crew orchestration. CrewAI pulled in
    chromadb as a transitive dependency purely for memory features this app
    never used — and chromadb in turn pulls in torch, onnxruntime, and
    transformers, which blew Vercel's 500MB serverless function size limit.
    Three direct, sequential Gemini calls produce identical output at a
    fraction of the deployed size.
    """
    response = genai_client.models.generate_content(
        model=GENERATION_MODEL,
        contents=user_prompt,
        config=genai_types.GenerateContentConfig(system_instruction=system_instruction),
    )
    return (response.text or "").strip()

# 3. DATABASE SETUP (POSTGRESQL)
# DATABASE_URL comes from the environment in deployment (e.g. a Neon
# connection string set on Vercel); falls back to the local docker-compose
# Postgres for development.
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://admin:password123@localhost:5433/agent_notes_db",
)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# This is quite helpful as it's an outline of what we want from the model, and it also serves as the SQLAlchemy ORM mapping for the notes table.
class DBNote(Base):
    __tablename__ = "notes"
    id = Column(String, primary_key=True, index=True)
    raw_content = Column(Text, nullable=False)
    processed_content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    tags = Column(JSON)
    action_items = Column(JSON)
    embedding = Column(JSON)
    drawing = Column(JSON)

Base.metadata.create_all(bind=engine)

# create_all() never ALTERs an existing table, and the notes table predates the
# tags/action_items columns, so add them idempotently for older databases.
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags JSON"))
    conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS action_items JSON"))
    conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding JSON"))
    conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS drawing JSON"))

# How close a past note must be to count as "relevant" (cosine distance:
# 0.0 = identical, ~1.0 = unrelated). Start at 0.3. Watch the [RAG] debug
# line printed to your terminal on each request — if genuinely relevant
# notes are getting filtered out, raise this; if irrelevant ones are still
# leaking through, lower it.
RELEVANCE_THRESHOLD = 0.3


# 4. GEMINI EMBEDDING HELPER (replaces the local Ollama nomic-embed-text call)
# Pinned to 768 dimensions to keep database rows compact and comparisons fast.
def get_embedding(text: str):
    try:
        result = genai_client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config=genai_types.EmbedContentConfig(output_dimensionality=768),
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None


def cosine_distance(left, right):
    """Return cosine distance for two equal-length vectors."""
    if not left or not right or len(left) != len(right):
        return None
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return None
    return 1 - (dot / (left_norm * right_norm))


# 4b. STRUCTURED EXTRACTION HELPERS
# The crew emits a fixed Markdown shape; these turn the relevant parts into
# structured data (checkable action items, topic tags) for the frontend.
NONE_PLACEHOLDER = re.compile(r"^(none\.?|no action items?.*|n/a)$", re.I)


def parse_action_items(markdown: str):
    """Pull the '## Action Items' section out of the processed markdown into a
    list of {text, done} dicts. Handles both bulleted and plain-line output."""
    if not markdown:
        return []
    items = []
    in_section = False
    for raw_line in markdown.split("\n"):
        line = raw_line.strip()
        if line.startswith("## "):
            in_section = line[3:].strip().lower().startswith("action items")
            continue
        if line.startswith("# "):
            in_section = False
            continue
        if not in_section or not line:
            continue
        bullet = re.match(r"^[-*+]\s+(.*)$", line)
        candidate = bullet.group(1).strip() if bullet else line
        candidate = candidate.replace("**", "").strip()
        if not candidate or NONE_PLACEHOLDER.match(candidate):
            continue
        items.append({"text": candidate, "done": False})
    return items


def generate_tags(raw_text: str):
    """Ask Gemini for 1-4 short topic tags. Deliberately resilient: any
    failure or garbage output falls back to an empty list rather than
    breaking note creation."""
    prompt = (
        "Read the note and output 1 to 4 short topic tags describing it.\n"
        "Rules: lowercase, single word or hyphenated, comma-separated, "
        "no '#', no sentences, no explanation.\n\n"
        f"Note: {raw_text}\n\nTags:"
    )
    try:
        response = genai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw = response.text or ""
    except Exception as e:
        print(f"Tag generation failed: {e}")
        return []

    tags = []
    for token in re.split(r"[,\n]", raw):
        cleaned = re.sub(r"[^a-z0-9-]", "", token.strip().lower().lstrip("#"))
        cleaned = cleaned.strip("-")
        if cleaned and cleaned not in tags:
            tags.append(cleaned)
    return tags[:4]


def serialize_note(row: "DBNote"):
    """Shape a DB row for the API. action_items backfills from the markdown for
    notes created before the column existed, so old notes still get checkboxes."""
    action_items = row.action_items
    if not action_items:
        action_items = parse_action_items(row.processed_content)
    return {
        "note_id": row.id,
        "raw_content": row.raw_content,
        "processed_note": row.processed_content,
        "created_at": row.created_at,
        "tags": row.tags or [],
        "action_items": action_items or [],
        "drawing": row.drawing,
    }


# 5. INITIALIZE FASTAPI & CORS
app = FastAPI(title="Lucent Notes API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# 6. PYDANTIC REQUEST SCHEMA
class NoteRequest(BaseModel):
    content: str


class DrawingNoteRequest(BaseModel):
    title: str = "Untitled sketch"
    drawing: dict


MAX_DRAWING_STROKES = 500
MAX_DRAWING_POINTS = 10000


def sanitize_drawing(drawing: dict):
    """Validate and compact a client drawing before it reaches PostgreSQL."""
    width = drawing.get("width", 900)
    height = drawing.get("height", 1200)
    strokes = drawing.get("strokes", [])
    paper = drawing.get("paper", "lined")
    if (width, height) not in {(900, 1200), (1000, 700)} or not isinstance(strokes, list):
        raise HTTPException(status_code=400, detail="The drawing format is invalid.")
    if len(strokes) > MAX_DRAWING_STROKES:
        raise HTTPException(status_code=400, detail=f"A drawing can contain up to {MAX_DRAWING_STROKES} strokes.")
    if paper not in {"lined", "grid", "dotted", "blank"}:
        paper = "lined"

    clean_strokes = []
    point_count = 0
    allowed_colors = {"#101828", "#635BFF", "#2563EB", "#DC2626"}
    allowed_widths = {5, 12, 20}
    for stroke in strokes:
        if not isinstance(stroke, dict) or not isinstance(stroke.get("points"), list):
            continue
        points = []
        for point in stroke["points"]:
            if not isinstance(point, list) or len(point) != 2:
                continue
            try:
                x, y = float(point[0]), float(point[1])
            except (TypeError, ValueError):
                continue
            if math.isfinite(x) and math.isfinite(y):
                points.append([round(min(width, max(0, x)), 2), round(min(height, max(0, y)), 2)])
        if not points:
            continue
        point_count += len(points)
        if point_count > MAX_DRAWING_POINTS:
            raise HTTPException(status_code=400, detail=f"A drawing can contain up to {MAX_DRAWING_POINTS:,} points.")
        color = stroke.get("color")
        stroke_width = stroke.get("width")
        clean_strokes.append({
            "color": color if color in allowed_colors else "#101828",
            "width": stroke_width if stroke_width in allowed_widths else 5,
            "points": points,
        })

    if not clean_strokes:
        raise HTTPException(status_code=400, detail="Draw something before saving.")
    return {"width": width, "height": height, "paper": paper, "strokes": clean_strokes}


def drawing_to_png(drawing: dict) -> bytes:
    """Render vector ink to a clean image for handwriting recognition."""
    width, height = drawing["width"], drawing["height"]
    image = Image.new("RGB", (width, height), "white")
    canvas = ImageDraw.Draw(image)
    for stroke in drawing["strokes"]:
        points = [(round(point[0]), round(point[1])) for point in stroke["points"]]
        ink_width = max(3, round(stroke["width"] * 1.25))
        if len(points) == 1:
            x, y = points[0]
            radius = max(2, ink_width // 2)
            canvas.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#101828")
        else:
            canvas.line(points, fill="#101828", width=ink_width, joint="curve")
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()


def recognize_handwriting(title: str, drawing: dict) -> str:
    """Use Gemini vision to convert the handwritten page into plain text."""
    image_part = genai_types.Part.from_bytes(
        data=drawing_to_png(drawing),
        mime_type="image/png",
    )
    prompt = f"""Transcribe the handwriting in this note image accurately.
The user supplied this optional title: {title}

Rules:
- Return only the words you can read from the handwritten page.
- Preserve line breaks and simple lists.
- Do not describe the paper, ink, shapes, arrows, or layout.
- Do not invent unclear words.
- If there are no readable words, return exactly: No readable handwriting detected."""
    try:
        response = genai_client.models.generate_content(
            model=GENERATION_MODEL,
            contents=[image_part, prompt],
        )
        transcript = (response.text or "").strip()
    except Exception as error:
        print(f"Handwriting recognition failed: {error}")
        raise HTTPException(
            status_code=503,
            detail="The handwriting could not be recognized. Please try again.",
        ) from error
    return transcript or "No readable handwriting detected."


@app.post("/notes/drawings")
def create_drawing_note(request: DrawingNoteRequest):
    title = request.title.strip()[:120] or "Untitled sketch"
    drawing = sanitize_drawing(request.drawing)
    transcript = recognize_handwriting(title, drawing)
    raw_text = f"{title}\n\n{transcript}"
    return process_note_content(raw_text, drawing=drawing)


# 7. PROCESS ENDPOINT (THE AGENT ORCHESTRATOR WITH THRESHOLDED RAG & PROMPT HARDENING)
def process_note_content(raw_text: str, drawing=None):
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty.")

    # A. PROGRAMMATIC RAG LOOKUP — embeddings live beside notes in Postgres,
    # so historical context survives Render restarts and redeploys.
    query_vector = get_embedding(raw_text)
    try:
        db = SessionLocal()
        candidates = (
            db.query(DBNote)
            .filter(DBNote.embedding.isnot(None))
            .order_by(desc(DBNote.created_at))
            .limit(500)
            .all()
        )
        scored = []
        if query_vector:
            for row in candidates:
                distance = cosine_distance(query_vector, row.embedding)
                if distance is not None:
                    scored.append((distance, row.raw_content))
        scored.sort(key=lambda item: item[0])
        print(f"[RAG] distances for this query: {[round(item[0], 4) for item in scored[:3]]}")

        relevant_documents = [
            document
            for distance, document in scored[:3]
            if distance <= RELEVANCE_THRESHOLD
        ]

        if relevant_documents:
            retrieved_context = "\n\n---\n\n".join(relevant_documents)
        else:
            retrieved_context = "No closely related past notes were found in the database archive."
    except Exception as e:
        print(f"Historical context lookup failed: {e}")
        retrieved_context = "Database archive is currently unavailable."
    finally:
        if "db" in locals():
            db.close()

    # B. HARDENED PROMPTS — three sequential Gemini calls, each with the same
    # role/goal/rules the original CrewAI agents used.
    extractor_system = (
        "You are a strict, data-extraction algorithm. You read input text and extract "
        "action items into a clean markdown list. You DO NOT output conversational filler. "
        'You DO NOT say "Here are the items". You output ONLY the list.\n\n'
        "Goal: Extract all tasks, deadlines, and assignees ONLY from the CURRENT raw notes. "
        "Never invent tasks. Never include tasks from historical context."
    )
    extractor_prompt = f"""Extract a clean list of action items from ONLY this current note:
    {raw_text}

    CRITICAL RULES:
    - Do NOT extract action items from any past historical context, even if you happen to know about it.
    - Do NOT invent people, tasks, or deadlines that are not explicitly stated in the note above.
    - If the note contains no clear action items, output "No action items identified." and nothing else.
    Output ONLY a bulleted markdown list (or the single line above if there is nothing to extract)."""
    extractor_output = run_gemini_agent(extractor_system, extractor_prompt)

    # C. ARCHIVIST — factual summary of how the current note relates to history.
    context_system = (
        "You are a research archivist. You read past notes and synthesize connections to "
        "current notes. You output pure, factual summaries. You NEVER use conversational "
        'filler like "Here is the summary". You NEVER produce a bulleted task list of your '
        "own — that is not your job.\n\n"
        "Goal: Analyze historical notes and write a strictly factual summary of how they "
        "relate to the current note. Never generate new action items."
    )
    context_prompt = f"""Analyze the current note:
    {raw_text}

    Compare it with the following past notes retrieved from our archive:
    {retrieved_context}

    CRITICAL RULES:
    - Only describe a connection if it is clearly and specifically relevant to the current note.
    - If nothing retrieved is genuinely relevant, output "No relevant historical context found." and nothing else.
    - Do NOT produce action items here. This section is historical reference only, not tasks.
    Summarize the historical connections in plain prose or a short bulleted list."""
    context_output = run_gemini_agent(context_system, context_prompt)

    # D. DRAFTER — combines both outputs into the final markdown template.
    drafter_system = (
        "You are an automated document formatter. You take input text and place it into a "
        "rigid Markdown template. You copy the Extractor's output into Action Items and the "
        "Archivist's output into Historical Context, verbatim in substance. You NEVER move "
        "content between those two sections, and you NEVER invent new details for the summary "
        "paragraph that are not present in the current raw note or in the Extractor/Archivist "
        "outputs you were given. You absolutely NEVER add pleasantries, greetings, sign-offs, "
        'or conversational text. You DO NOT say "Here is the document." You output NOTHING '
        "but the final Markdown document.\n\n"
        "Goal: Take the provided data and format it EXACTLY according to the strict Markdown "
        "template, without merging, reassigning, or inventing content between sections."
    )
    drafter_prompt = f"""Combine the data into a single Markdown document.
    You MUST output ONLY the markdown. DO NOT output any other text before or after the markdown.
    Use EXACTLY this structure:

    # Meeting Summary
    [Write a 1-paragraph overview based STRICTLY on this current note: "{raw_text}" — and on the Extractor/Archivist outputs you were given. Do not introduce any topic, technology, or detail that is not present in the current note or in those two outputs.]

    ## Action Items
    [Insert the exact output from the Extractor Agent here — nothing from the Archivist's output belongs in this section]

    ## Historical Context Retrieved
    [Insert the exact output from the Context Agent here — nothing from the Extractor's output belongs in this section]

    STRICT RULES:
    - Do not merge, blend, or move content between the Action Items and Historical Context sections.
    - Do not add any new action items of your own.
    - The summary paragraph must not mention anything (technologies, people, causes) that is absent from the current raw note.
    - Do not add a preamble ("Here is...") or a sign-off ("Let me know if...") of any kind.
    - If a section has nothing to show, write "None." under that heading rather than omitting or inventing content.

    Extractor's output (Action Items source):
    {extractor_output}

    Archivist's output (Historical Context source):
    {context_output}"""
    processed_result = run_gemini_agent(drafter_system, drafter_prompt)

    # D2. STRUCTURED EXTRACTION — turn the markdown into checkable action items
    # and derive topic tags for filtering/dashboard.
    action_items = parse_action_items(processed_result)
    tags = generate_tags(raw_text)
    if drawing and "handwritten" not in tags:
        tags = ["handwritten", *tags][:4]

    # E. SAVE TO POSTGRES
    note_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        new_note = DBNote(
            id=note_id,
            raw_content=raw_text,
            processed_content=processed_result,
            tags=tags,
            action_items=action_items,
            embedding=query_vector,
            drawing=drawing,
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)
    except Exception as e:
        db.rollback()
        print(f"Error saving to Postgres: {e}")
        raise HTTPException(
            status_code=503,
            detail="The note could not be saved. Please try again.",
        ) from e
    finally:
        db.close()

    return serialize_note(new_note)


@app.post("/notes/process")
def process_note(request: NoteRequest):
    return process_note_content(request.content)


# 8. HEALTH CHECK — lets the frontend show a live connection indicator.
@app.get("/health")
def health():
    db = None
    try:
        db = SessionLocal()
        db.execute(select(1))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": False},
        )
    finally:
        if db is not None:
            db.close()
    return {"status": "ok", "database": True}


# 9. LIST / READ / DELETE — the process endpoint above never gave the
# frontend a way to reload note history, so a page refresh silently lost
# everything. These make notes durable across sessions.
@app.get("/notes")
def list_notes():
    db = SessionLocal()
    try:
        rows = db.query(DBNote).order_by(desc(DBNote.created_at)).all()
        return [serialize_note(row) for row in rows]
    finally:
        db.close()


@app.get("/notes/{note_id}")
def get_note(note_id: str):
    db = SessionLocal()
    try:
        row = db.query(DBNote).filter(DBNote.id == note_id).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Note not found.")
        return serialize_note(row)
    finally:
        db.close()


# 9b. UPDATE — currently used to persist action-item checkbox state (and,
# optionally, edited tags) from the frontend.
class NoteUpdate(BaseModel):
    action_items: Optional[List[dict]] = None
    tags: Optional[List[str]] = None


@app.patch("/notes/{note_id}")
def update_note(note_id: str, update: NoteUpdate):
    db = SessionLocal()
    try:
        row = db.query(DBNote).filter(DBNote.id == note_id).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Note not found.")
        if update.action_items is not None:
            # Normalize to the {text, done} shape and ignore anything malformed.
            row.action_items = [
                {"text": str(item.get("text", "")), "done": bool(item.get("done"))}
                for item in update.action_items
                if isinstance(item, dict) and item.get("text")
            ]
        if update.tags is not None:
            row.tags = [str(t) for t in update.tags]
        db.commit()
        db.refresh(row)
        return serialize_note(row)
    finally:
        db.close()


@app.delete("/notes/{note_id}")
def delete_note(note_id: str):
    db = SessionLocal()
    try:
        row = db.query(DBNote).filter(DBNote.id == note_id).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Note not found.")
        db.delete(row)
        db.commit()
    finally:
        db.close()

    return {"note_id": note_id, "deleted": True}


# 10. DASHBOARD STATS — aggregate numbers for the frontend overview.
@app.get("/stats")
def stats():
    db = SessionLocal()
    try:
        rows = db.query(DBNote).all()
    finally:
        db.close()

    total_notes = len(rows)
    open_items = 0
    done_items = 0
    tag_counts = {}
    week_ago = datetime.utcnow() - timedelta(days=7)
    notes_this_week = 0

    for row in rows:
        items = row.action_items or parse_action_items(row.processed_content) or []
        for item in items:
            if item.get("done"):
                done_items += 1
            else:
                open_items += 1
        for tag in (row.tags or []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        if row.created_at and row.created_at >= week_ago:
            notes_this_week += 1

    top_tags = sorted(
        ({"tag": t, "count": c} for t, c in tag_counts.items()),
        key=lambda x: x["count"],
        reverse=True,
    )

    return {
        "total_notes": total_notes,
        "open_action_items": open_items,
        "done_action_items": done_items,
        "notes_this_week": notes_this_week,
        "top_tags": top_tags,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))

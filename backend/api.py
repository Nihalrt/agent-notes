import os
import uuid
import requests
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Text, DateTime, desc, select
from sqlalchemy.orm import sessionmaker, declarative_base
import chromadb
from crewai import Agent, Task, Crew, Process, LLM

# 1. ENVIRONMENT SETUP & PRIVACY
os.environ["CREWAI_DISABLE_TELEMETRY"] = "true"

# 2. LOCAL LLM CONFIGURATION
local_llm = LLM(
    model="ollama/llama3",
    base_url="http://localhost:11434"
)

# 3. DATABASE SETUP (POSTGRESQL & CHROMADB)
DATABASE_URL = "postgresql://admin:password123@localhost:5433/agent_notes_db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBNote(Base):
    __tablename__ = "notes"
    id = Column(String, primary_key=True, index=True)
    raw_content = Column(Text, nullable=False)
    processed_content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# NOTE: metadata={"hnsw:space": "cosine"} only takes effect the FIRST time this
# collection is created. If you already have an existing collection from earlier
# testing, run scripts/reset_vector_db.py once to recreate it cleanly on cosine
# distance before this matters.
chroma_client = chromadb.HttpClient(host="localhost", port=8000)
collection = chroma_client.get_or_create_collection(
    name="user_knowledge_vault",
    metadata={"hnsw:space": "cosine"}
)

# How close a past note must be to count as "relevant" (cosine distance:
# 0.0 = identical, ~1.0 = unrelated). Start at 0.3. Watch the [RAG] debug
# line printed to your terminal on each request — if genuinely relevant
# notes are getting filtered out, raise this; if irrelevant ones are still
# leaking through, lower it.
RELEVANCE_THRESHOLD = 0.3


# 4. LOCAL OLLAMA EMBEDDING HELPER
def get_local_embedding(text: str):
    try:
        response = requests.post(
            "http://localhost:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text}
        )
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return [0.0] * 768


# 5. INITIALIZE FASTAPI & CORS
app = FastAPI(title="Autonomous Action Note-Taker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 6. PYDANTIC REQUEST SCHEMA
class NoteRequest(BaseModel):
    content: str


# 7. PROCESS ENDPOINT (THE AGENT ORCHESTRATOR WITH THRESHOLDED RAG & PROMPT HARDENING)
@app.post("/notes/process")
def process_note(request: NoteRequest):
    raw_text = request.content
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty.")

    # A. PROGRAMMATIC RAG LOOKUP — now with a relevance threshold instead of
    # blindly trusting the top 3 nearest neighbors.
    try:
        query_vector = get_local_embedding(raw_text)
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=3,
            include=["documents", "distances"]
        )
        documents = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]

        print(f"[RAG] distances for this query: {distances}")

        relevant_documents = [
            doc for doc, dist in zip(documents, distances)
            if dist <= RELEVANCE_THRESHOLD
        ]

        if relevant_documents:
            retrieved_context = "\n\n---\n\n".join(relevant_documents)
        else:
            retrieved_context = "No closely related past notes were found in the database archive."
    except Exception as e:
        print(f"ChromaDB lookup failed: {e}")
        retrieved_context = "Database archive is currently unavailable."

    # B. HARDENED AGENTS
    extractor_agent = Agent(
        role='Action Item Extractor',
        goal='Extract all tasks, deadlines, and assignees ONLY from the CURRENT raw notes. Never invent tasks. Never include tasks from historical context.',
        backstory="""You are a strict, data-extraction algorithm. You read input text and extract action items into a clean markdown list. 
        You DO NOT output conversational filler. You DO NOT say "Here are the items". You output ONLY the list.""",
        verbose=True,
        allow_delegation=False,
        llm=local_llm
    )

    context_agent = Agent(
        role='Knowledge Archivist',
        goal='Analyze historical notes and write a strictly factual summary of how they relate to the current note. Never generate new action items.',
        backstory="""You are a research archivist. You read past notes and synthesize connections to current notes. 
        You output pure, factual summaries. You NEVER use conversational filler like "Here is the summary".
        You NEVER produce a bulleted task list of your own — that is not your job.""",
        verbose=True,
        allow_delegation=False,
        llm=local_llm
    )

    drafter_agent = Agent(
        role='Executive Communications Director',
        goal='Take the provided data and format it EXACTLY according to the strict Markdown template, without merging, reassigning, or inventing content between sections.',
        backstory="""You are an automated document formatter. You take input text and place it into a rigid Markdown template.
        You copy the Extractor's output into Action Items and the Archivist's output into Historical Context, verbatim in substance.
        You NEVER move content between those two sections, and you NEVER invent new details for the summary paragraph
        that are not present in the current raw note or in the Extractor/Archivist outputs you were given.
        You absolutely NEVER add pleasantries, greetings, sign-offs, or conversational text. You DO NOT say "Here is the document." 
        You output NOTHING but the final Markdown document.""",
        verbose=True,
        allow_delegation=False,
        llm=local_llm
    )

    # C. HARDENED TASKS
    extract_task = Task(
        description=f"""Extract a clean list of action items from ONLY this current note:
        {raw_text}

        CRITICAL RULES:
        - Do NOT extract action items from any past historical context, even if you happen to know about it.
        - Do NOT invent people, tasks, or deadlines that are not explicitly stated in the note above.
        - If the note contains no clear action items, output "No action items identified." and nothing else.
        Output ONLY a bulleted markdown list (or the single line above if there is nothing to extract).""",
        expected_output="A bulleted markdown list of action items drawn strictly from the current note. Zero conversational text.",
        agent=extractor_agent
    )

    context_task = Task(
        description=f"""Analyze the current note:
        {raw_text}

        Compare it with the following past notes retrieved from our archive:
        {retrieved_context}

        CRITICAL RULES:
        - Only describe a connection if it is clearly and specifically relevant to the current note.
        - If nothing retrieved is genuinely relevant, output "No relevant historical context found." and nothing else.
        - Do NOT produce action items here. This section is historical reference only, not tasks.
        Summarize the historical connections in plain prose or a short bulleted list.""",
        expected_output="A brief markdown summary of genuinely relevant historical references, or a single line stating none were found. Zero conversational text. No action items.",
        agent=context_agent
    )

    draft_task = Task(
        description=f"""Combine the data into a single Markdown document.
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
        """,
        expected_output="A strict Markdown document matching the exact structure requested, with cleanly separated sections and a summary grounded only in the current note. ZERO conversational text.",
        agent=drafter_agent,
        context=[extract_task, context_task]
    )

    # D. RUN CREW
    crew = Crew(
        agents=[extractor_agent, context_agent, drafter_agent],
        tasks=[extract_task, context_task, draft_task],
        process=Process.sequential,
        verbose=True
    )
    
    processed_result = str(crew.kickoff())

    # E. SAVE TO POSTGRES
    note_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        new_note = DBNote(
            id=note_id,
            raw_content=raw_text,
            processed_content=processed_result
        )
        db.add(new_note)
        db.commit()
    except Exception as e:
        print(f"Error saving to Postgres: {e}")
    finally:
        db.close()

    # F. SAVE TO CHROMADB
    try:
        embedding = get_local_embedding(raw_text)
        collection.add(
            embeddings=[embedding],
            documents=[raw_text],
            ids=[note_id],
            metadatas=[{"created_at": str(datetime.utcnow())}]
        )
    except Exception as e:
        print(f"Error adding to ChromaDB: {e}")

    return {
        "note_id": note_id,
        "processed_note": processed_result
    }


# 8. HEALTH CHECK — lets the frontend show a live connection indicator.
@app.get("/health")
def health():
    try:
        db = SessionLocal()
        db.execute(select(1))
        db.close()
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "database": db_ok}


# 9. LIST / READ / DELETE — the process endpoint above never gave the
# frontend a way to reload note history, so a page refresh silently lost
# everything. These make notes durable across sessions.
@app.get("/notes")
def list_notes():
    db = SessionLocal()
    try:
        rows = db.query(DBNote).order_by(desc(DBNote.created_at)).all()
        return [
            {
                "note_id": row.id,
                "raw_content": row.raw_content,
                "processed_note": row.processed_content,
                "created_at": row.created_at,
            }
            for row in rows
        ]
    finally:
        db.close()


@app.get("/notes/{note_id}")
def get_note(note_id: str):
    db = SessionLocal()
    try:
        row = db.query(DBNote).filter(DBNote.id == note_id).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Note not found.")
        return {
            "note_id": row.id,
            "raw_content": row.raw_content,
            "processed_note": row.processed_content,
            "created_at": row.created_at,
        }
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

    try:
        collection.delete(ids=[note_id])
    except Exception as e:
        print(f"ChromaDB delete failed for {note_id}: {e}")

    return {"note_id": note_id, "deleted": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
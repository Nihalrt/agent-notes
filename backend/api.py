import os
import uuid
import requests
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import chromadb
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import tool

# Environment setup and privacy
os.environ["CREWAI_DISABLE_TELEMETRY"] = "True"

# Model Setup
"""
 Creating a local object that connects to Ollama via a HTTP protocol so that the agents can use llama3 model for processing tasks, the port points to 11434

"""
local_llm = LLM(
    model="ollama/llama3",
    base_url="http://localhost:11434"
)

# DATABASE SETUP
# Relational Database SQLAlchemy setup
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

# Vector Db Setup for context agent
# establish a connection to the ChromeDB
# Create an index in the db to store and for mathematical lookups for the context agent to use for historical context.
chrome_client = chromadb.HttpClient(host="localhost", port=8000)
collection = chrome_client.get_or_create_collection("user_knowledge_vault")


# LOCAL OLLAMA EMBEDDING HELPER
def get_local_ollama_embedding(text):
    """
    This function sends a request to the local Ollama server to get embeddings for the provided text.
    It uses the 'ollama/embeddings' endpoint and returns the embedding vector.
    """
    try:
        response = requests.post(
            "http://localhost:11434/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text}
        )
        response.raise_for_status()  # Raise an error for bad responses
        return response.json().get("embedding")
    except Exception as e:
        print(f"Error fetching embedding: {e}")
        return [0.0] * 768  # Return a zero vector of size 768 as a fallback

# # CUSTOM CREWAI LOCAL DB LOOKUP TOOL
# @tool("Search Past Notes Vault") # converts into a format that the crewAI can read and understand
# def search_past_notes_vault(query: str) -> str:
#     """
#     When the agent is looking up for any historical context, it takes in text as query, calls in collection.query() to lookup in the vector db and
#     returns similar concepts from the past as a text."""
#     query_vector = get_local_ollama_embedding(query)
#     results = collection.query(
#         query_embeddings=[query_vector],
#         n_results=3  # number of similar results to return
#     )
#     documents = results.get("documents", [[]])[0]  # Get the first list of documents
#     if not documents:
#         return "No relevant historical context found."
    
#     context = "\n\n---\n\n".join(documents)
#     return f"Relevant historical context:\n\n{context}"

app = FastAPI(Title="Autonomous Notes Taker")
# This basically initializes the FastAPI server instance to accept any network traffic (React Native, Flutter, Web, etc.) to access the API endpoints.
# CORS = Cross-Origin Resource Sharing, allows apis to be accessed from different domains.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class NoteRequest(BaseModel):
    content: str

@app.post("/notes/process")
def process_note(request: NoteRequest):
    raw_text = request.content
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty.")
    
    try:
        query_vector = get_local_ollama_embedding(raw_text)
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=3
        )
        documents = results.get("documents", [[]])[0]
        if documents:
            retrieved_context = "\n\n---\n\n".join(documents)
        else:
            retrieved_context = "No relevant historical context found."
    except Exception as e:
        print(f"Error during vector search: {e}")
        retrieved_context = "Error retrieving historical context."

    # A. Define Agents with local LLM
    extractor_agent = Agent(
        role='Action Item Extractor',
        goal='Identify all implicit and explicit tasks, deadlines, and action items from raw notes.',
        backstory="""You are a meticulous Project Manager. You read messy meeting thoughts and 
        extract what must be done, who is assigned, and any deadlines.""",
        verbose=True,
        allow_delegation=False,
        llm=local_llm
    )

    context_agent = Agent(
        role='Knowledge Archivist',
        goal='Utilize tools to search the past database archive, find historical context, and connect notes.',
        backstory="""You are an expert Research Archivist. You use database query tools to hunt down 
        past notes related to current topics to ensure the company never repeats mistakes or loses context.""",
        verbose=True,
        allow_delegation=False,
        llm=local_llm
    )

    drafter_agent = Agent(
        role='Executive Communications Director',
        goal='Synthesize raw text, action items, and retrieved database context into a clean, professional summary.',
        backstory="""You rewrite messy content into elegant, executive-ready Markdown files with clear headings.""",
        verbose=True,
        allow_delegation=False,
        llm=local_llm
    )

    # B. Define Tasks with dependencies
    extract_task = Task(
        description=f"Analyze these notes and extract a clean list of action items: \n\n{raw_text}",
        expected_output="A formatted bulleted markdown list of action items, assignees, and deadlines.",
        agent=extractor_agent
    )

    context_task = Task(
        description=f"""Analyze the current raw notes:
        {raw_text}
        
        Compare them with the following relevant past notes retrieved from our database archive:
        {retrieved_context}
        
        Summarize the connections between the past notes and current notes.""", # <-- Updated to inject retrieved_context directly
        expected_output="A markdown summary of matched historical references and how they relate to the current notes.",
        agent=context_agent
    )

    draft_task = Task(
        description="""Take the raw notes, the extracted action items, and the retrieved context, and combine them into a single, polished Markdown document.
        Use the following structure:
        # Meeting Summary
        [1 paragraph overview]
        
        ## Action Items
        [From Extractor]
        
        ## Historical Context Retrieved
        [From Archivist]""",
        expected_output="A fully polished executive Markdown note.",
        agent=drafter_agent,
        context=[extract_task, context_task]
    )

    # C. Run CrewAI Workflow
    crew = Crew(
        agents=[extractor_agent, context_agent, drafter_agent],
        tasks=[extract_task, context_task, draft_task],
        process=Process.sequential,
        verbose=True
    )

    # run agents and retrive the output 
    final_output = str(crew.kickoff())

    # D. Save that refined draft permanently in the db
    note_id = str(uuid.uuid4())
    db_session = SessionLocal()
    try:
        new_note = DBNote(
            id=note_id,
            raw_content=raw_text,
            processed_content=final_output
        )
        db_session.add(new_note)
        db_session.commit()
    except Exception as e:
        print(f"Error saving note to database: {e}")
    finally:
        db_session.close()
    
    # E. Adding the proccessed note to the ChromeDb Vector for future searches
    try:
        embedding = get_local_ollama_embedding(final_output)
        collection.add(
            documents=[final_output],
            metadatas=[{"created_at": str(datetime.utcnow())}],
            embeddings=[embedding],
            ids=[note_id]
        )
    except Exception as e:
        print(f"Error adding note to vector database: {e}")
    
    return {"note_id": note_id, "processed_note": final_output}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
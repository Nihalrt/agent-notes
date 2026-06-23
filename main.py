import os
from crewai import Agent, Task, Crew, Process, LLM

os.environ["CREWAI_DISABLE_TELEMETRY"] = "True"

local_llm = LLM(
    model="ollama/llama3",
    base_url="http://localhost:11434",
)

extractor_agent = Agent(
    role='Action Item Extractor',
    goal='Identify all implicit and explicit tasks, deadlines, and action items from raw meeting notes.',
    backstory='You are a highly organized project manager. You excel at reading messy, stream-of-consciousness meeting notes and pulling out exactly what needs to be done, by whom, and by when.',
    verbose=True,
    allow_delegation=False,
    llm=local_llm
)

context_agent = Agent(
    role="Knowledge Archivist",
    goal="Identify core themes and concepts in the notes and suggest any relevant historical context.",
    backstory="""You are a brilliant librarian with a photographic memory of the company's past projects. 
    When given a note, you identify the main entities (people, technologies, projects) and highlight 
    what past context might be missing or relevant. (Note: Currently operating in brainstorming mode 
    until Vector DB is attached).""",
    verbose=True,
    allow_delegation=False,
    llm=local_llm
)

extractor_agent = Agent(
    role="Executive Communications Director",
    goal='Synthesize raw notes, extracted tasks, and historical context into a professional, polished document.',
    backstory="""You are an expert communicator who drafts updates for executives. You take messy 
    inputs and transform them into clean, highly readable Markdown documents with clear headings, 
    bullet points, and context sections.""",
    verbose=True,
    allow_delegation=False,
    llm=local_llm
)

RAW_NOTE_PATH = "notes-vault/2025-05-20-raw.md"
PROCESSED_NOTE_PATH = "notes-vault/2025-05-20-processed.md"

# helper function to read the raw note

def read_raw_note(filepath):
    if not os.path.exists(filepath):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w") as f:
            f.write("Talked to Sarah about the database migration issue. She thinks the latency is caused by the new Redis caching layer. Need to review the specs by Friday.")
    with open(filepath, "r") as f:
        return f.read()






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

drafter_agent = Agent(
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

raw_meeting_notes = read_raw_note(RAW_NOTE_PATH)

# Creating tasks for each agent

# Task 1 - Extract action items from raw notes
extract_task = Task(
    description=f"Analyze the following raw meeting notes and extract a bulleted list of actionable tasks and deadlines: \n\n{raw_meeting_notes}",
    expected_output="A markdown formatted bulleted list of action items, assignees, and deadlines.",
    agent=extractor_agent
)

# Task 2 - Identify context and themes from raw notes
context_task = Task(
    description=f"Analyze the following raw meeting notes: \n\n{raw_meeting_notes}\n\nIdentify the top 3 key themes, people, or technologies mentioned. Write a brief paragraph explaining what related past documentation the user should look up.",
    expected_output="A short markdown section titled 'Suggested Context' detailing themes to cross-reference.",
    agent=context_agent
)

# Task 3 - Synthesize notes into a polished document
draft_task = Task(
    description="""Take the raw notes, the extracted action items, and the suggested context, and combine them into a single, polished Markdown document. 
    Use the following structure:
    # Meeting Summary
    [1 paragraph executive summary]
    
    ## Action Items
    [Bulleted list from Extractor]
    
    ## Historical Context to Review
    [Context from Archivist]""",
    expected_output="A complete, professional Markdown document containing the summary, action items, and context.",
    agent=drafter_agent,
    context=[extract_task, context_task],  # This basically ensures that the drafter agent does not hallucinate and only executes after context and extractor agent.
    output_file=PROCESSED_NOTE_PATH  # Automatically saves the output to the respective file.
)

note_taking_crew = Crew(
    agents=[extractor_agent, context_agent, drafter_agent],
    tasks=[extract_task, context_task, draft_task],
    process=Process.sequential,
    verbose=True
)

if __name__ == "__main__":
    print(f"Starting Agent Workflow on {RAW_NOTE_PATH}...")
    print("This may take a minute or two depending on your machine's speed.")
    
    # Kick off the workflow
    result = note_taking_crew.kickoff()
    
    print("\n==============================================")
    print("WORKFLOW COMPLETE!")
    print(f"Your polished notes have been saved to: {PROCESSED_NOTE_PATH}")
    print("==============================================\n")
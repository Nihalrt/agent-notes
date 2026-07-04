"""
One-time cleanup: your ChromaDB collection has been seeded with the same
"Sarah / Redis / caching layer" dummy note many times across earlier testing
(from main.py's auto-generated fallback note, plus the manual seed step from
early on). That's been skewing retrieval for any new "migration"-related note.

This wipes the collection and recreates it fresh, explicitly using cosine
distance (0.0 = identical, ~1.0 = unrelated), which pairs with the
RELEVANCE_THRESHOLD in api.py.

Run this once, with your Docker containers up and your venv active:
    python scripts/reset_vector_db.py
"""
import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)

try:
    client.delete_collection(name="user_knowledge_vault")
    print("Deleted old 'user_knowledge_vault' collection.")
except Exception as e:
    print(f"Nothing to delete, or already gone: {e}")

collection = client.create_collection(
    name="user_knowledge_vault",
    metadata={"hnsw:space": "cosine"}
)
print("Created a fresh 'user_knowledge_vault' collection using cosine distance.")
print("Your Postgres notes table is untouched — only the vector memory was reset.")
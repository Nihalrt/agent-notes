# Engineering walkthrough

Lucent connects note capture, AI processing, and durable retrieval through a shared web/mobile codebase.

## From input to stored note

1. [The Expo interface](../frontend/App.js) uses [an API adapter](../frontend/src/api.js) to connect web or mobile clients to FastAPI.
2. Typed text enters the note-processing endpoint. Handwriting enters through [HandwritingCanvas](../frontend/src/components/HandwritingCanvas.js) as vector strokes.
3. [The backend](../backend/api.py) validates and compacts drawing data, renders a temporary PNG in memory, and asks Gemini to transcribe it.
4. The text pipeline retrieves relevant historical notes, extracts action items, summarizes context, and formats a note. Tags and a 768-dimensional embedding are stored with the note in PostgreSQL.
5. Read, update, delete, and statistics endpoints support note history and task persistence.

## Decisions and trade-offs

- Vector strokes preserve resolution without persisting a screenshot. Rendering for transcription is separate from the stored drawing.
- Direct sequential Gemini calls keep the backend smaller than an orchestration stack. They still incur network latency, quota use, and provider failures.
- Embeddings persist beside notes, so retrieval survives backend restarts. The current lookup scans up to 500 recent candidates; it is not a vector-index performance claim.
- Empty task arrays are distinct from missing legacy data. Clearing tasks must not regenerate them from earlier Markdown.
- A shared interface supports web and mobile, while native packaging and hardware-specific stylus behavior need device testing.

## Validation

The [API regression suite](../backend/tests/test_api.py) runs against in-memory
SQLite with a dummy Gemini key. It covers drawing validation/rendering, point
limits, task persistence, empty notes, and missing records.

From the repository root:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt httpx
.venv/bin/python -m unittest discover -s backend/tests -v
```

[CI](../.github/workflows/tests.yml) also exports the Expo web build. Passing
these checks does not validate PostgreSQL-specific migrations, handwriting
accuracy, live Gemini behavior, or native iOS/Android releases.

## Deployment boundary

The web frontend is configured for GitHub Pages and the API for Vercel, with
PostgreSQL supplied separately. Environment configuration stays on the backend;
the frontend contains no private shared credential.

The current API has no authentication, per-user isolation, or rate limiting.
CORS is a browser control, not authorization. Use sample data in the public demo;
notes and rendered handwriting are transmitted to Gemini. Saved drawings are
currently view-only. See [deployment and security limits](../README.md#security-boundary).

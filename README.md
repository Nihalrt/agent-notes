# Lucent

Lucent turns unstructured notes into summaries, action items, topic tags, and relevant historical context. It runs as a responsive web application and an Expo application for iOS and Android.

It also supports handwritten notes. A drawing can be created with an Apple Pencil, another stylus, a finger, or a mouse. Drawings are stored as vector strokes rather than screenshots, so they remain clear when shown at different screen sizes. Gemini reads the handwriting, and the recognized text then follows the same summary, action-item, tag, embedding, and historical-context process as a typed note.

## Main parts

- `frontend/`: Expo and React Native interface for web, iOS, and Android.
- `backend/`: FastAPI service that processes notes with Gemini and stores data with SQLAlchemy.
- PostgreSQL: stores notes, tasks, tags, and 768-value semantic-search embeddings.
- `pyproject.toml`: describes the hosted Python service and its required packages.
- `vercel.json`: gives note-processing requests enough time to finish on Vercel.
- `.github/workflows/deploy-pages.yml`: builds and publishes the web interface to GitHub Pages.

## Run locally

Requirements:

- Node.js 20.19.4 or newer
- Python 3.12
- Docker
- A Gemini API key

Create `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
DATABASE_URL=postgresql://admin:password123@localhost:5433/agent_notes_db
ALLOWED_ORIGINS=*
```

Start PostgreSQL:

```bash
docker compose up -d --wait
```

Start the backend from the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8001
```

Start the frontend in a second terminal:

```bash
cd frontend
npm ci
npx expo start
```

Press `w` for the browser or `i` for the iOS Simulator. Expo automatically gives a physical phone or simulator the correct local computer address; the source code does not contain a fixed Wi-Fi IP.

## Handwritten notes

1. Open Lucent and select **Start drawing**, or open **New note** and select **Draw**.
2. Add an optional title.
3. Write in the lined area with an Apple Pencil, stylus, finger, or mouse.
4. Choose lined, grid, dotted, or blank paper.
5. Choose black, purple, blue, or red ink and select Fine, Pen, or Marker width.
6. Select **Full page** for a larger portrait notebook and **Minimize** to return to the note sheet without losing your work.
7. Select Pen or Eraser. A quick double-tap on the page also switches between the two tools.
8. Use Undo, Redo, or Clear when needed, then select **Save drawing**.

The backend validates drawing size and content, renders a temporary clean image in memory, and asks Gemini Vision to transcribe the handwriting. The image is not stored. The recognized text is saved with the vector drawing and processed like every other note. Each new drawing uses a portrait internal canvas, which lets the same note scale correctly on a phone, tablet, and desktop. Saved drawings are currently view-only; editing an existing drawing can be added as a later feature.

The canvas blocks browser text selection, disables page gestures while ink is active, rejects multi-touch input, and temporarily ignores finger input after a stylus event. These controls reduce accidental palm input. Apple Pencil hardware double-tap is not exposed consistently by browsers or Expo Go, so the canvas provides an in-app double-tap gesture and a permanent Eraser button. Direct hardware double-tap support requires a custom iOS build with a PencilKit native module.

## No-cost deployment

The supported deployment structure is:

1. GitHub Pages hosts the static web interface.
2. Vercel runs the public FastAPI service on its free Hobby plan.
3. A hosted PostgreSQL provider stores durable application data.
4. Gemini provides note processing and embeddings.

### 1. Create the hosted PostgreSQL database

Create a PostgreSQL database with a provider such as Neon. Copy its complete connection string. The backend creates and updates its `notes` table when it starts.

### 2. Deploy the backend on Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New > Project** and import this repository.
3. Keep the project root at the repository root. Vercel reads `pyproject.toml` and finds the FastAPI application in `backend.api:app`.
4. Add `GEMINI_API_KEY` as an environment variable.
5. Add the hosted PostgreSQL connection string as `DATABASE_URL`.
6. Add `ALLOWED_ORIGINS` with the value `https://nihalrt.github.io`.
7. Deploy the project on the free Hobby plan.
8. Open the generated Vercel URL followed by `/health` and confirm that it returns `{"status":"ok","database":true}`.

Add another comma-separated origin to `ALLOWED_ORIGINS` if a custom web domain is introduced later.

### 3. Deploy the frontend on GitHub Pages

1. In the GitHub repository, open **Settings > Pages**.
2. Set **Source** to **GitHub Actions**.
3. Merge or push the deployment files to `main`.
4. The `Deploy frontend to GitHub Pages` workflow builds the Expo web app and publishes it.
5. Open `https://nihalrt.github.io/agent-notes/` after the workflow finishes.

Set `EXPO_PUBLIC_API_BASE` in `.github/workflows/deploy-pages.yml` to the generated Vercel project URL before deploying the frontend.

## Mobile release path

The same codebase is prepared for web, iOS, and Android. On an iPhone or iPad, install Expo Go, start the project with `npx expo start`, and scan the QR code while the mobile device and development computer are on the same network. Apple Pencil input is available on supported iPads through the same drawing canvas.

A distributable store build can be produced later with Expo Application Services. The configured application identifiers are:

- iOS: `com.nihalrt.lucentnotes`
- Android: `com.nihalrt.lucentnotes`

Store publication is separate from the free web deployment and may require Apple or Google developer-account fees.

## Deployment limitations

- Vercel's free Hobby plan has usage, execution-time, and application-size limits.
- Free hosting is appropriate for testing, demonstrations, and portfolio use. Add monitoring, backups, authentication, and managed secrets before storing sensitive production data.
- The current application is a single-user workspace. Authentication and per-user data ownership should be added before a public multi-user launch.

import axios from "axios";

// Point this at your FastAPI backend. On a physical device, swap
// localhost for your Mac's LAN IP, e.g. http://192.168.1.50:8001
export const API_BASE = "http://localhost:8001";

function mapNote(row) {
  return {
    id: row.note_id,
    raw: row.raw_content,
    processed: row.processed_note,
    createdAt: new Date(row.created_at),
  };
}

export async function fetchNotes() {
  const res = await axios.get(`${API_BASE}/notes`);
  return res.data.map(mapNote);
}

export async function processNote(content) {
  const res = await axios.post(`${API_BASE}/notes/process`, { content });
  return mapNote({
    note_id: res.data.note_id,
    raw_content: content,
    processed_note: res.data.processed_note,
    created_at: new Date().toISOString(),
  });
}

export async function deleteNote(id) {
  await axios.delete(`${API_BASE}/notes/${id}`);
}

export async function checkHealth() {
  try {
    const res = await axios.get(`${API_BASE}/health`, { timeout: 4000 });
    return res.data.status === "ok";
  } catch {
    return false;
  }
}

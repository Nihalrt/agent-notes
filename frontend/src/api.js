import axios from "axios";

// Your Mac's LAN IP, not "localhost" — a phone on Expo Go can't resolve
// "localhost" to your Mac, only to itself. This changes whenever your Mac
// gets a new DHCP lease (Wi-Fi reconnect, router reboot, etc.) — re-run
// `ipconfig getifaddr en0` and update this if the app ever shows "backend
// offline" after working before.
export const API_BASE = "http://192.168.1.65:8001";

function mapNote(row) {
  return {
    id: row.note_id,
    raw: row.raw_content,
    processed: row.processed_note,
    createdAt: new Date(row.created_at),
    tags: row.tags || [],
    actionItems: row.action_items || [],
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
    tags: res.data.tags,
    action_items: res.data.action_items,
  });
}

// Persist action-item checkbox state. Returns the updated note.
export async function updateActionItems(id, actionItems) {
  const res = await axios.patch(`${API_BASE}/notes/${id}`, {
    action_items: actionItems,
  });
  return mapNote(res.data);
}

export async function deleteNote(id) {
  await axios.delete(`${API_BASE}/notes/${id}`);
}

export async function fetchStats() {
  const res = await axios.get(`${API_BASE}/stats`);
  return res.data;
}

export async function checkHealth() {
  try {
    const res = await axios.get(`${API_BASE}/health`, { timeout: 4000 });
    return res.data.status === "ok";
  } catch {
    return false;
  }
}

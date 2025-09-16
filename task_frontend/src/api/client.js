/**
 * Simple API client for the task backend.
 * Uses REACT_APP_API_BASE environment variable set in frontend .env.
 */
const API_BASE = process.env.REACT_APP_API_BASE;

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('REACT_APP_API_BASE is not set. Configure it in task_frontend/.env');
}

// PUBLIC_INTERFACE
export async function fetchNotes({ user_id, tag_ids, status, priority, archived, q, page, pageSize, sortBy, sortDir } = {}) {
  /** Fetch notes with optional filters and sorting, including priority support. */
  const params = new URLSearchParams();
  if (user_id) params.set('user_id', user_id);
  if (Array.isArray(tag_ids) && tag_ids.length) params.set('tag_ids', tag_ids.join(','));
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (archived !== undefined) params.set('archived', archived ? 'true' : 'false');
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  if (sortBy) params.set('sortBy', sortBy);
  if (sortDir) params.set('sortDir', sortDir);

  const res = await fetch(`${API_BASE}/notes?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function createNote({ user_id, title, content, status, priority, tags } = {}) {
  /** Create a note with priority and tags */
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, title, content, status, priority, tags }),
  });
  if (!res.ok) throw new Error(`Failed to create note: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function updateNote(id, { title, content, status, priority, archived, tags } = {}) {
  /** Update a note; include priority to change it */
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, status, priority, archived, tags }),
  });
  if (!res.ok) throw new Error(`Failed to update note ${id}: ${res.status}`);
  return res.json();
}

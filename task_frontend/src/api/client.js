/**
 * Simple API client for the task backend.
 * Uses REACT_APP_API_BASE environment variable set in frontend .env.
 * Ensures HTTPS API endpoint when the app is served over HTTPS to avoid mixed-content "Failed to fetch".
 */
const API_BASE = process.env.REACT_APP_API_BASE;

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('REACT_APP_API_BASE is not set. Configure it in task_frontend/.env');
}

// Token helpers (localStorage). This app uses Bearer JWT (no cookies).
const TOKEN_KEY = 'auth_token';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors (private mode, etc)
  }
}

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// PUBLIC_INTERFACE
export function logout() {
  /** Clear local session token. */
  setToken('');
}

// PUBLIC_INTERFACE
export function isAuthenticated() {
  /** Returns boolean whether a token exists (not validated here). */
  return !!getToken();
}

// PUBLIC_INTERFACE
export async function login({ email, password }) {
  /** Login via POST /login. Stores JWT on success and returns { token, user }. */
  if (!API_BASE) throw new Error('API base not configured');
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let msg = `Login failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  if (data?.token) setToken(data.token);
  return data;
}

// PUBLIC_INTERFACE
export async function signup({ name, email, password }) {
  /** Signup via POST /signup. Does not auto-login by default. */
  if (!API_BASE) throw new Error('API base not configured');
  const res = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    let msg = `Signup failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchNotes({ user_id, tag_ids, status, priority, archived, q, page, pageSize, sortBy, sortDir } = {}) {
  /** Fetch notes (JWT protected) with optional filters and sorting, including priority support. */
  if (!API_BASE) throw new Error('API base not configured');
  const params = new URLSearchParams();
  // user_id is derived from JWT on the backend; do not send from client for security.
  if (Array.isArray(tag_ids) && tag_ids.length) params.set('tag_ids', tag_ids.join(','));
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (archived !== undefined) params.set('archived', archived ? 'true' : 'false');
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  if (sortBy) params.set('sortBy', sortBy);
  if (sortDir) params.set('sortDir', sortDir);

  const res = await fetch(`${API_BASE}/notes?${params.toString()}`, {
    headers: {
      ...authHeader(),
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function createNote({ title, content, status, priority, tags } = {}) {
  /** Create a note (JWT protected) with priority and tags. user_id is inferred from JWT. */
  if (!API_BASE) throw new Error('API base not configured');
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ title, content, status, priority, tags }),
  });
  if (!res.ok) throw new Error(`Failed to create note: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function updateNote(id, { title, content, status, priority, archived, tags } = {}) {
  /** Update a note (JWT protected); include priority to change it. */
  if (!API_BASE) throw new Error('API base not configured');
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ title, content, status, priority, archived, tags }),
  });
  if (!res.ok) throw new Error(`Failed to update note ${id}: ${res.status}`);
  return res.json();
}

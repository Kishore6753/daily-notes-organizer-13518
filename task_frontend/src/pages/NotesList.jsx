/**
 * Simple Notes List showcasing priority filtering and sorting.
 * This is a minimal integration example that can be wired into the app router.
 */
import React, { useEffect, useState } from 'react';
import { fetchNotes, createNote, isAuthenticated, login } from '../api/client';
import PrioritySelector from '../components/PrioritySelector';
import PriorityChip from '../components/PriorityChip';

// PUBLIC_INTERFACE
export default function NotesList() {
  /** Notes list with priority filter/sort and create-note form. */
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState(''); // '' means all
  const [sortBy, setSortBy] = useState('priority');
  const [sortDir, setSortDir] = useState('DESC');

  // Create form
  const [title, setTitle] = useState('');
  const [newPriority, setNewPriority] = useState('low');

  async function load() {
    setLoading(true);
    try {
      const data = await fetchNotes({
        q: q || undefined,
        priority: priority || undefined,
        sortBy,
        sortDir,
        pageSize: 50,
      });
      setNotes(data);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, priority, sortBy, sortDir]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      // Optional demo: if not authenticated, you could attempt a demo login
      if (!isAuthenticated()) {
        // Replace with your real auth flow; this is only a safeguard for the demo page.
        // await login({ email: 'demo@example.com', password: 'demopass' });
        throw new Error('Please login first to create a note.');
      }
      await createNote({ title: title.trim(), priority: newPriority });
      setTitle('');
      setNewPriority('low');
      load();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message);
    }
  }

  return (
    <div style={{ padding: 24, color: '#E8ECF3', fontFamily: 'Inter, Arial, sans-serif', background: '#0F1115', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: 16 }}>My Notes</h2>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ height: 36, borderRadius: 8, padding: '0 10px', background: '#141821', color: '#E8ECF3', border: '1px solid #2A3142' }}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8C96A9' }}>Filter Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ height: 32, borderRadius: 8, padding: '4px 8px', background: '#141821', color: '#E8ECF3', border: '1px solid #2A3142' }}
          >
            <option value="">All</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8C96A9' }}>Sort By</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ height: 32, borderRadius: 8, padding: '4px 8px', background: '#141821', color: '#E8ECF3', border: '1px solid #2A3142' }}
          >
            <option value="priority">Priority</option>
            <option value="updated_at">Last Updated</option>
            <option value="created_at">Created</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8C96A9' }}>Direction</span>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
            style={{ height: 32, borderRadius: 8, padding: '4px 8px', background: '#141821', color: '#E8ECF3', border: '1px solid #2A3142' }}
          >
            <option value="DESC">DESC</option>
            <option value="ASC">ASC</option>
          </select>
        </label>
      </div>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <input
          placeholder="New note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ height: 36, borderRadius: 8, padding: '0 10px', background: '#141821', color: '#E8ECF3', border: '1px solid #2A3142', minWidth: 260 }}
        />
        <PrioritySelector value={newPriority} onChange={setNewPriority} />
        <button
          type="submit"
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 8,
            background: '#6C8BFF',
            color: '#0F1115',
            border: 'none',
            fontWeight: 600,
          }}
        >
          Add
        </button>
      </form>

      {loading ? (
        <div>Loading…</div>
      ) : notes.length === 0 ? (
        <div style={{ color: '#B7C0D1' }}>No notes found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                background: '#1B2130',
                border: '1px solid #2A3142',
                borderRadius: 12,
                padding: 12,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{n.title}</div>
                {n.content ? <div style={{ fontSize: 14, color: '#B7C0D1' }}>{n.content}</div> : null}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <PriorityChip value={n.priority} />
                <span
                  style={{
                    fontSize: 12,
                    color: '#8C96A9',
                  }}
                >
                  {new Date(n.updated_at || n.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use strict';

const NotesService = require('../services/notes');

class NotesController {
  // PUBLIC_INTERFACE
  /**
   * List/search notes (public). If user_id is provided via query, it will filter; otherwise returns all notes.
   */
  async list(req, res, next) {
    try {
      const q = { ...req.query };
      const result = await NotesService.list(q);
      res.json(result);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Create a new note (public). Accepts optional user_id in body; if missing, defaults to user_id=1 for demo.
   */
  async create(req, res, next) {
    try {
      const payload = { ...req.body };
      if (payload.user_id === undefined || payload.user_id === null) {
        payload.user_id = 1; // demo/public mode default user
      }
      const note = await NotesService.create(payload);
      res.status(201).json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Get a single note (public)
   */
  async get(req, res, next) {
    try {
      const note = await NotesService.getById(Number(req.params.id));
      if (!note) return res.status(404).json({ message: 'Note not found' });
      res.json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Update a note (public)
   */
  async update(req, res, next) {
    try {
      const existing = await NotesService.getById(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: 'Note not found' });
      const note = await NotesService.update(Number(req.params.id), req.body);
      if (!note) return res.status(404).json({ message: 'Note not found' });
      res.json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete a note (public)
   */
  async remove(req, res, next) {
    try {
      const existing = await NotesService.getById(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: 'Note not found' });
      const result = await NotesService.remove(Number(req.params.id));
      res.json(result);
    } catch (e) { next(e); }
  }
}

module.exports = new NotesController();

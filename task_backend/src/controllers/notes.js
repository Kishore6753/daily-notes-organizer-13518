'use strict';

const NotesService = require('../services/notes');

class NotesController {
  // PUBLIC_INTERFACE
  /**
   * List/search notes (JWT required). Uses req.user.id; ignores user_id query param.
   */
  async list(req, res, next) {
    try {
      const q = { ...req.query, user_id: req.user.id };
      const result = await NotesService.list(q);
      res.json(result);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Create a new note (JWT required). user_id taken from token.
   */
  async create(req, res, next) {
    try {
      const payload = { ...req.body, user_id: req.user.id };
      const note = await NotesService.create(payload);
      res.status(201).json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Get a single note (JWT required; must belong to user)
   */
  async get(req, res, next) {
    try {
      const note = await NotesService.getById(Number(req.params.id));
      if (!note) return res.status(404).json({ message: 'Note not found' });
      if (note.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      res.json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Update a note (JWT required; must belong to user)
   */
  async update(req, res, next) {
    try {
      const existing = await NotesService.getById(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: 'Note not found' });
      if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      const note = await NotesService.update(Number(req.params.id), req.body);
      if (!note) return res.status(404).json({ message: 'Note not found' });
      res.json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete a note (JWT required; must belong to user)
   */
  async remove(req, res, next) {
    try {
      const existing = await NotesService.getById(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: 'Note not found' });
      if (existing.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      const result = await NotesService.remove(Number(req.params.id));
      res.json(result);
    } catch (e) { next(e); }
  }
}

module.exports = new NotesController();

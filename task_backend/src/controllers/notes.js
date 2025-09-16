'use strict';

const NotesService = require('../services/notes');

class NotesController {
  // PUBLIC_INTERFACE
  /**
   * List/search notes
   */
  async list(req, res, next) {
    try {
      const result = await NotesService.list(req.query);
      res.json(result);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Create a new note
   */
  async create(req, res, next) {
    try {
      const note = await NotesService.create(req.body);
      res.status(201).json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Get a single note
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
   * Update a note
   */
  async update(req, res, next) {
    try {
      const note = await NotesService.update(Number(req.params.id), req.body);
      if (!note) return res.status(404).json({ message: 'Note not found' });
      res.json(note);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete a note
   */
  async remove(req, res, next) {
    try {
      const result = await NotesService.remove(Number(req.params.id));
      res.json(result);
    } catch (e) { next(e); }
  }
}

module.exports = new NotesController();

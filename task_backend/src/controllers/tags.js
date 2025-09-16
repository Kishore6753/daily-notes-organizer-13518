'use strict';

const TagsService = require('../services/tags');

class TagsController {
  // PUBLIC_INTERFACE
  async list(req, res, next) {
    try {
      const result = await TagsService.list(req.query);
      res.json(result);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  async create(req, res, next) {
    try {
      const tag = await TagsService.create(req.body);
      res.status(201).json(tag);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  async get(req, res, next) {
    try {
      const tag = await TagsService.getById(Number(req.params.id));
      if (!tag) return res.status(404).json({ message: 'Tag not found' });
      res.json(tag);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  async update(req, res, next) {
    try {
      const tag = await TagsService.update(Number(req.params.id), req.body);
      if (!tag) return res.status(404).json({ message: 'Tag not found' });
      res.json(tag);
    } catch (e) { next(e); }
  }

  // PUBLIC_INTERFACE
  async remove(req, res, next) {
    try {
      const result = await TagsService.remove(Number(req.params.id));
      res.json(result);
    } catch (e) { next(e); }
  }
}

module.exports = new TagsController();

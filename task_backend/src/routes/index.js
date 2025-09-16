const express = require('express');
const healthController = require('../controllers/health');
const usersController = require('../controllers/users');
const tagsController = require('../controllers/tags');
const notesController = require('../controllers/notes');
const authController = require('../controllers/auth');
const { checkConnection } = require('../db/bootstrap');
const { auth } = require('../middleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * tags:
 *   - name: Health
 *     description: Service health checks
 *   - name: Auth
 *     description: Signup and login
 *   - name: Users
 *     description: Manage users
 *   - name: Tags
 *     description: Manage tags
 *   - name: Notes
 *     description: Manage notes with tags, status, and priority
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

/**
 * @swagger
 * /db/health:
 *   get:
 *     summary: Database connectivity health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is reachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       500:
 *         description: Database error
 */
router.get('/db/health', async (req, res) => {
  const result = await checkConnection();
  if (result.ok) return res.status(200).json({ ok: true });
  return res.status(500).json({ ok: false, error: result.error });
});

/**
 * @swagger
 * /signup:
 *   post:
 *     summary: User signup
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, description: "User name" }
 *               email: { type: string, description: "Unique email" }
 *               password: { type: string, format: password, minLength: 6 }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       400: { description: Validation error }
 *       409: { description: Email already registered }
 */
router.post('/signup', authController.signup.bind(authController));

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: JWT issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string, description: "JWT token" }
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401: { description: Invalid credentials }
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Users list
 *   post:
 *     summary: Create user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string, description: "User display name" }
 *               email: { type: string, description: "Unique email" }
 *     responses:
 *       201:
 *         description: User created
 */
router.get('/users', usersController.list.bind(usersController));
router.post('/users', usersController.create.bind(usersController));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User found }
 *       404: { description: Not found }
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/users/:id', usersController.get.bind(usersController));
router.put('/users/:id', usersController.update.bind(usersController));
router.delete('/users/:id', usersController.remove.bind(usersController));

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: List tags
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of tags }
 *   post:
 *     summary: Create tag
 *     tags: [Tags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               color: { type: string, description: "Hex color, e.g., #6C8BFF" }
 *     responses:
 *       201: { description: Created }
 */
router.get('/tags', tagsController.list.bind(tagsController));
router.post('/tags', tagsController.create.bind(tagsController));

/**
 * @swagger
 * /tags/{id}:
 *   get:
 *     summary: Get tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *   put:
 *     summary: Update tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               color: { type: string }
 *   delete:
 *     summary: Delete tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 */
router.get('/tags/:id', tagsController.get.bind(tagsController));
router.put('/tags/:id', tagsController.update.bind(tagsController));
router.delete('/tags/:id', tagsController.remove.bind(tagsController));

/**
 * @swagger
 * /notes:
 *   get:
 *     security: [{ bearerAuth: [] }]
 *     summary: List/search notes
 *     description: Filter by tag_ids (comma-separated), status, priority, archived, q (search by title/content). user_id is derived from JWT.
 *     tags: [Notes]
 *     parameters:
 *       - in: query
 *         name: tag_ids
 *         schema: { type: string, example: "1,2,3" }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [not_started, in_progress, completed] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, moderate, high] }
 *       - in: query
 *         name: archived
 *         schema: { type: boolean }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [priority, updated_at, created_at] }
 *         description: Sort field (default updated_at)
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [ASC, DESC] }
 *         description: Sort direction (default DESC)
 *     responses:
 *       200: { description: Notes list }
 *       401: { description: Unauthorized }
 *   post:
 *     security: [{ bearerAuth: [] }]
 *     summary: Create note
 *     tags: [Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               status: { type: string, enum: [not_started, in_progress, completed] }
 *               priority: { type: string, enum: [low, moderate, high] }
 *               recurrence_pattern: { type: string, enum: [none, daily, weekly, monthly], description: "Default none" }
 *               recurrence_start_date: { type: string, format: date, description: "YYYY-MM-DD" }
 *               recurrence_end_date: { type: string, format: date, description: "YYYY-MM-DD or null" }
 *               tags:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       201: { description: Created }
 *       401: { description: Unauthorized }
 */
router.get('/notes', auth, notesController.list.bind(notesController));
router.post('/notes', auth, notesController.create.bind(notesController));

/**
 * @swagger
 * /notes/{id}:
 *   get:
 *     security: [{ bearerAuth: [] }]
 *     summary: Get note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *   put:
 *     security: [{ bearerAuth: [] }]
 *     summary: Update note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               status: { type: string, enum: [not_started, in_progress, completed] }
 *               priority: { type: string, enum: [low, moderate, high] }
 *               archived: { type: boolean }
 *               recurrence_pattern: { type: string, enum: [none, daily, weekly, monthly] }
 *               recurrence_start_date: { type: string, format: date }
 *               recurrence_end_date: { type: string, format: date }
 *               tags:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200: { description: Updated }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *   delete:
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/notes/:id', auth, notesController.get.bind(notesController));
router.put('/notes/:id', auth, notesController.update.bind(notesController));
router.delete('/notes/:id', auth, notesController.remove.bind(notesController));

module.exports = router;

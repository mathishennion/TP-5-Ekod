const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Joi = require('joi');

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN,
  process.env.NETLIFY_SITE_URL,
].filter(Boolean);

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

// Middleware pour parser le JSON envoyé dans le corps des requêtes
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(origin));
  }
}));
app.use(express.json());

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const assigneeSchema = Joi.string()
  .trim()
  .max(50)
  .pattern(/^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$/u)
  .allow('', null);

const createTaskSchema = Joi.object({
  titre: Joi.string().trim().min(1).max(100).required(),
  assignee: assigneeSchema
}).unknown(false);

const updateTaskSchema = Joi.object({
  titre: Joi.string().trim().min(1).max(100),
  complete: Joi.boolean(),
  assignee: assigneeSchema
}).min(1).unknown(false);

const validateBody = (schema, body) => schema.validate(body, { abortEarly: true });

const toTask = (row) => ({
  id: row.num_tasks,
  titre: row.titre_tasks,
  completed: row.status_tasks === 'Completed',
  assignee: row.assignee
});

/**
 * POST /tasks
 * Ajoute une nouvelle tâche
 * Body attendu : { "titre": "Faire les courses", "assignee": "Zorali" }
 */
app.post('/tasks', asyncRoute(async (req, res) => {
  const { error, value } = validateBody(createTaskSchema, req.body);
  if (error) {
    return res.status(400).json({ error: 'Données invalides. Le titre est obligatoire et le bénévole doit être désigné par son prénom uniquement.' });
  }

  const result = await pool.query(
    'INSERT INTO tasks (titre_tasks, status_tasks, assignee) VALUES ($1, $2, $3) RETURNING *',
    [value.titre, 'Pending', value.assignee || null]
  );
  res.status(201).json(toTask(result.rows[0]));
}));

/**
 * GET /tasks
 * Récupère la liste complète des tâches
 */
app.get('/tasks', asyncRoute(async (req, res) => {
  const result = await pool.query('SELECT * FROM tasks ORDER BY num_tasks');
  let tasks = result.rows.map(toTask);

  if (req.query.completed === 'True') {
    tasks = tasks.filter((task) => task.completed);
  } else if (req.query.completed === 'False') {
    tasks = tasks.filter((task) => !task.completed);
  }

  res.status(200).json(tasks);
}));

/**
 * PUT /tasks/:id
 * Modifie une tâche spécifique (titre et/ou statut)
 * Body attendu : { "titre": "...", "complete": true, "assignee": "Zorali" }
 */
app.put('/tasks/:id', asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Identifiant de tâche invalide.' });
  }

  const { error, value } = validateBody(updateTaskSchema, req.body);
  if (error) {
    return res.status(400).json({ error: 'Données invalides. Le bénévole doit être désigné par son prénom uniquement.' });
  }

  const current = await pool.query('SELECT * FROM tasks WHERE num_tasks = $1', [id]);
  if (current.rowCount === 0) {
    return res.status(404).json({ error: `Aucune tâche trouvée avec l'id ${id}.` });
  }

  const newTitle = value.titre === undefined ? current.rows[0].titre_tasks : value.titre;
  const newStatus = value.complete === undefined
    ? current.rows[0].status_tasks
    : (value.complete ? 'Completed' : 'Pending');
  const newAssignee = value.assignee === undefined
    ? current.rows[0].assignee
    : (value.assignee || null);
  const result = await pool.query(
    'UPDATE tasks SET titre_tasks = $1, status_tasks = $2, assignee = $3 WHERE num_tasks = $4 RETURNING *',
    [newTitle, newStatus, newAssignee, id]
  );
  res.status(200).json(toTask(result.rows[0]));
}));

/**
 * DELETE /tasks/:id
 * Supprime une tâche spécifique
 */
app.delete('/tasks/:id', asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Identifiant de tâche invalide.' });
  }

  const result = await pool.query('DELETE FROM tasks WHERE num_tasks = $1', [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: `Aucune tâche trouvée avec l'id ${id}.` });
  }

  res.status(200).json({ message: 'Tâche supprimée.' });
}));

/**Nouvelle fonctionnalité 1 (pour l'étudiant A)
§ Ajouter une fonctionnalité permettant de marquer une tâche comme
complétée/non complétée.
§ Route suggérée : PATCH /tasks/:id/completed
*/
app.patch('/tasks/:id/completed', asyncRoute(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Identifiant de tâche invalide.' });
  }

  const { complete } = req.body;
  if (typeof complete !== 'boolean') {
    return res.status(400).json({ error: 'Le champ "complete" doit être un booléen.' });
  }

  const result = await pool.query(
    'UPDATE tasks SET status_tasks = $1 WHERE num_tasks = $2 RETURNING *',
    [complete ? 'Completed' : 'Pending', id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: `Aucune tâche trouvée avec l'id ${id}.` });
  }

  res.status(200).json(toTask(result.rows[0]));
}));

// Route de vérification que le serveur tourne
app.get('/', (req, res) => {
  res.send('Tasks API en ligne. Voir /tasks');
});

app.use((error, req, res, _next) => {
  console.error('Erreur interne de l’API.');
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

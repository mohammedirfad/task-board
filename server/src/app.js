import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import settingRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false);
app.use((req, res, next) => { req.id = randomUUID(); res.setHeader('X-Request-Id', req.id); next(); });
app.use(helmet());
app.use(cors({ origin: config.clientOrigin.split(',').map((origin) => origin.trim()), methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '32kb', strict: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' } } }));
app.use('/', authRoutes);

const openapi = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'Task Board API', version: '1.0.0', description: 'REST API for authenticated task management, Kanban status transitions, capacity planning, and settings. All date values use YYYY-MM-DD. Story points measure workload only.' },
    servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Paste the JWT returned from POST /login.' } },
      schemas: { TaskInput: { type: 'object', required: ['title','storyPoints','priority','plannedDate','dueDate'], properties: { title: { type: 'string', maxLength: 160 }, description: { type: 'string' }, storyPoints: { type: 'integer', minimum: 1, maximum: 99999 }, priority: { type: 'string', enum: ['Low','Medium','High','Critical'] }, status: { type: 'string', enum: ['Backlog','Planned','In Progress','Completed'] }, plannedDate: { type: 'string', format: 'date' }, dueDate: { type: 'string', format: 'date' } } } }
    }
  }, apis: ['./src/routes/*.js']
});
// Define the combined collection path explicitly so tooling can show both GET and POST.
openapi.paths['/tasks'] = {
  get: { tags: ['Tasks'], summary: 'List, search, filter, sort and paginate tasks', description: 'Searches title and description. Supports priority/status filters, an allow-listed sort key, and page/limit. Maximum page size is 100.', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'search', schema: { type: 'string' } }, { in: 'query', name: 'priority', schema: { type: 'string', enum: ['Low','Medium','High','Critical'] } }, { in: 'query', name: 'status', schema: { type: 'string', enum: ['Backlog','Planned','In Progress','Completed'] } }, { in: 'query', name: 'sortBy', schema: { type: 'string', enum: ['title','storyPoints','priority','status','plannedDate','dueDate'], default: 'plannedDate' } }, { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc','desc'], default: 'asc' } }, { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } }, { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }], responses: { 200: { description: 'Page of tasks with pagination metadata' }, 401: { description: 'Authentication required' } } },
  post: { tags: ['Tasks'], summary: 'Create a task', description: 'Validates required fields, whole-number story points and date ordering. Planned tasks must fit both daily and weekly capacity. The response includes the resulting capacity snapshot.', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } } }, responses: { 201: { description: 'Created task and resulting capacity snapshot' }, 400: { description: 'Input validation failed' }, 409: { description: 'Capacity exceeded' } } }
};
openapi.paths['/tasks/{id}'] = {
  get: { tags: ['Tasks'], summary: 'Get a task by ID', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Task record' }, 404: { description: 'Task not found' } } },
  put: { tags: ['Tasks'], summary: 'Replace task fields or update its status', description: 'Checks planned daily and weekly capacity on every mutation and reserves capacity only for tasks in Planned. Completed tasks cannot return to Backlog. The response includes the resulting capacity snapshot.', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } } }, responses: { 200: { description: 'Updated task and resulting capacity snapshot' }, 409: { description: 'Capacity exceeded or invalid status transition' } } },
  delete: { tags: ['Tasks'], summary: 'Permanently delete a task', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 204: { description: 'Task deleted' }, 404: { description: 'Task not found' } } }
};
openapi.paths['/health'] = {
  get: {
    tags: ['System'],
    summary: 'Check API availability',
    description: 'Returns a simple liveness response without exposing database credentials or configuration.',
    responses: {
      200: {
        description: 'API process is responding',
        content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } }
      }
    }
  }
};
app.get('/openapi.json', (_req, res) => res.json(openapi));
app.use('/api-docs', (_req, res, next) => {
  // Swagger UI bootstraps its explorer with inline code; keep this relaxed policy scoped to docs only.
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
  next();
}, swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true, customSiteTitle: 'Task Board API Docs' }));

app.use('/tasks', authenticate, taskRoutes);
app.use('/settings', authenticate, settingRoutes);
app.use('/dashboard', authenticate, dashboardRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;

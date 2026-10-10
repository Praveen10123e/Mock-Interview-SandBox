import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from './generated/client';
import { ImportService } from './services/ImportService';
import { SearchService } from './services/SearchService';
import { QuestionManagementService } from './services/QuestionManagementService';
import { DatasetService } from './services/DatasetService';
import path from 'path';

const app = express();
let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── HEALTH & READINESS PROBES ────────────────────────────────────────────────

// Liveness probe (process is running)
app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'question-bank-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness & Primary Health probe (verifies database connectivity and schema availability)
app.get(['/health', '/health/ready'], async (req, res) => {
  try {
    // 1. Verify database connection
    await prisma.$queryRaw`SELECT 1`;

    // 2. Verify critical schema availability via catalog lookup (zero table-scan/lock overhead)
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT (to_regclass('public."Question"') IS NOT NULL) AS exists
    `;
    const tableExists = tableCheck?.[0]?.exists ?? false;

    if (!tableExists) {
      return res.status(503).json({
        status: 'degraded',
        service: 'question-bank-service',
        database: 'connected',
        schema: 'uninitialized',
        error: 'Required schema table public."Question" does not exist in the database. Pending migrations must be applied.',
      });
    }

    return res.status(200).json({
      status: 'healthy',
      service: 'question-bank-service',
      database: 'connected',
      schema: 'ready',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'unhealthy',
      service: 'question-bank-service',
      database: 'disconnected',
      error: 'Database connection failed',
    });
  }
});

// Response Wrapper Utilities
const sendSuccess = (
  res: express.Response,
  data: any,
  pagination: any = null,
  message = 'Success',
  statusCode = 200
) => {
  res.status(statusCode).json({ success: true, data, pagination, message });
};

const sendError = (res: express.Response, error: any, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : 'SERVER_ERROR',
      message: error.message || 'An error occurred',
    },
  });
};

// Helper: Check if request is from Faculty or Administrator
const isFacultyOrAdmin = (req: express.Request): boolean => {
  const roleHeader = (req.headers['x-user-role'] as string) || '';
  const roles = roleHeader.split(',').map((r) => r.trim().toUpperCase());
  return roles.includes('FACULTY') || roles.includes('ADMINISTRATOR') || roles.includes('ADMIN');
};

// Helper: Enforce Faculty authorization
const requireFaculty = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!isFacultyOrAdmin(req)) {
    return sendError(
      res,
      new Error('Forbidden: Only faculty or administrators can perform this action'),
      403
    );
  }
  next();
};

// ── IMPORT ENGINE ────────────────────────────────────────────────────────────

app.post('/import', requireFaculty, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return sendError(res, new Error('Filename is required'), 400);

    const filepath = path.resolve(__dirname, '../../../../data-engineering/dataset/', filename);
    ImportService.importDataset(filepath, filename).catch(console.error);

    sendSuccess(res, null, null, 'Import job accepted and is running in the background.');
  } catch (err: any) {
    sendError(res, err);
  }
});

// ── VALIDATION ENDPOINT ──────────────────────────────────────────────────────

app.post('/validate', requireFaculty, async (req, res) => {
  try {
    const validationResult = QuestionManagementService.validateQuestion(req.body);
    sendSuccess(res, validationResult, null, 'Validation completed');
  } catch (err: any) {
    sendError(res, err);
  }
});

// ── CATEGORIES, TOPICS, LANGUAGES, TAGS, STATS ───────────────────────────────

app.get('/categories', async (req, res) => {
  try {
    sendSuccess(res, await SearchService.getCategories(req.query.excludeTypes as string | string[]));
  } catch (err: any) {
    sendError(res, err);
  }
});

app.get('/topics', async (req, res) => {
  try {
    sendSuccess(res, await SearchService.getTopics(req.query.excludeTypes as string | string[]));
  } catch (err: any) {
    sendError(res, err);
  }
});

app.get('/languages', async (req, res) => {
  try {
    sendSuccess(res, await SearchService.getLanguages());
  } catch (err: any) {
    sendError(res, err);
  }
});

app.get('/tags', async (req, res) => {
  try {
    sendSuccess(res, await SearchService.getTags());
  } catch (err: any) {
    sendError(res, err);
  }
});

app.get('/statistics', async (req, res) => {
  try {
    sendSuccess(res, await SearchService.getStatistics(req.query.excludeTypes as string | string[]));
  } catch (err: any) {
    sendError(res, err);
  }
});

// ── QUESTION SEARCH & LISTING ────────────────────────────────────────────────

app.get('/', async (req, res) => {
  try {
    const isFaculty = isFacultyOrAdmin(req);
    const results = await SearchService.searchQuestions({
      ...req.query,
      isFaculty,
    });
    const { data, ...pagination } = results;
    sendSuccess(res, data, pagination);
  } catch (err: any) {
    sendError(res, err);
  }
});

// ── DATASET MANAGEMENT (ADMIN & FACULTY) ───────────────────────────────────

app.get('/datasets', requireFaculty, async (req, res) => {
  try {
    const data = await DatasetService.listDatasets();
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err);
  }
});

app.get('/datasets/batches', requireFaculty, async (req, res) => {
  try {
    const data = await DatasetService.listBatches();
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err);
  }
});

app.post('/datasets/validate', requireFaculty, async (req, res) => {
  try {
    const questions = req.body?.questions || req.body;
    const data = DatasetService.validateQuestions(questions);
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err);
  }
});

app.get('/datasets/:id/export', requireFaculty, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await DatasetService.exportDatasetQuestions(id);
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err);
  }
});

app.get('/datasets/:id', requireFaculty, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const data = await DatasetService.getDatasetDetail(id, limit);
    sendSuccess(res, data);
  } catch (err: any) {
    sendError(res, err, err.message === 'Dataset not found' ? 404 : 500);
  }
});

// ── QUESTION DETAIL ──────────────────────────────────────────────────────────

app.get('/:id', async (req, res) => {
  try {
    const isFaculty = isFacultyOrAdmin(req);
    const question = await SearchService.getQuestionById(req.params.id, isFaculty);
    if (!question) {
      return sendError(res, new Error('Question not found'), 404);
    }
    sendSuccess(res, question);
  } catch (err: any) {
    sendError(res, err);
  }
});

// ── CREATE QUESTION (FACULTY ONLY) ───────────────────────────────────────────

app.post('/', requireFaculty, async (req, res) => {
  try {
    const identityId = req.headers['x-identity-id'] as string;
    const validation = QuestionManagementService.validateQuestion(req.body);
    if (!validation.valid) {
      return sendError(res, new Error(`Validation failed: ${validation.errors.join(' ')}`), 400);
    }

    const created = await QuestionManagementService.createQuestion(req.body, identityId);
    sendSuccess(res, created, null, 'Question created successfully', 201);
  } catch (err: any) {
    sendError(res, err);
  }
});

// ── UPDATE QUESTION (FACULTY ONLY) ───────────────────────────────────────────

app.put('/:id', requireFaculty, async (req, res) => {
  try {
    const identityId = req.headers['x-identity-id'] as string;
    const questionId = (req.params.id as string) || '';
    const updated = await QuestionManagementService.updateQuestion(questionId, req.body, identityId);
    sendSuccess(res, updated, null, 'Question updated successfully');
  } catch (err: any) {
    sendError(res, err, err.message === 'Question not found' ? 404 : 500);
  }
});

// ── DELETE / ARCHIVE QUESTION (FACULTY ONLY) ─────────────────────────────────

app.delete('/:id', requireFaculty, async (req, res) => {
  try {
    const questionId = (req.params.id as string) || '';
    const deleted = await QuestionManagementService.deleteQuestion(questionId);
    sendSuccess(res, deleted, null, 'Question archived successfully');
  } catch (err: any) {
    sendError(res, err, err.message === 'Question not found' ? 404 : 500);
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Question Bank Service running on port ${PORT}`);
});

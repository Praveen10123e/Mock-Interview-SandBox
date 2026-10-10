import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ExecutionController } from './controllers/ExecutionController';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' })); // Restrict payload size

const router = express.Router();

router.post('/execute', ExecutionController.execute);
router.get('/languages', ExecutionController.getLanguages);

// Mount router
app.use('/', router);

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'judge-service' }));

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
  console.log(`Judge Service running on port ${PORT}`);
});

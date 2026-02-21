import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import deployRouter from './routes/deploy.js';
import tokensRouter from './routes/tokens.js';
import statsRouter  from './routes/stats.js';
import userRouter   from './routes/user.js';
import { startIndexer } from './services/indexer.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.DASHBOARD_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Routes
app.use('/api/deploy',  deployRouter);
app.use('/api/tokens',  tokensRouter);
app.use('/api/stats',   statsRouter);
app.use('/api/user',    userRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', platform: 'DaiLaunch' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`⚡ DaiLaunch API running on port ${PORT}`);
  startIndexer();
});

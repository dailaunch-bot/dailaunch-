import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import deployRouter from './routes/deploy';
import tokensRouter from './routes/tokens';
import statsRouter  from './routes/stats';
import userRouter   from './routes/user';
import authRouter   from './routes/auth';
import { startIndexer } from './services/indexer';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.DASHBOARD_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-github-token'],
}));
app.use(express.json());

// Routes
app.use('/auth',        authRouter);
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

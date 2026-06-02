import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { connectMongo } from './services/mongo.js';
import { connectRedis } from './services/redis.js';
import { initFirebase } from './services/firebase.js';
import { authMiddleware } from './middleware/auth.js';
import teamsRouter from './routes/teams.js';
import documentsRouter from './routes/documents.js';
import chatRouter from './routes/chat.js';
import conversationsRouter from './routes/conversations.js';
import projectsRouter from './routes/projects.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authMiddleware);
app.use('/api/teams', teamsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/projects', projectsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

async function start() {
  try {
    await connectMongo();
    console.log('MongoDB connected');
  } catch (e) {
    console.warn('MongoDB connection failed, continuing without DB:', e.message);
  }

  try {
    await connectRedis();
    console.log('Redis connected');
  } catch (e) {
    console.warn('Redis connection failed, continuing without cache:', e.message);
  }

  initFirebase();

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

start();

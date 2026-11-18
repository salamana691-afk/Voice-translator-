import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAutoDubRouter } from './backend/src/routes/autodubRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '512kb' }));

  const autoDubRouter = createAutoDubRouter();
  // Mount under /api/* for web frontend and at root endpoints for direct Android Retrofit client parity
  app.use('/api', autoDubRouter);
  app.get('/health', (req, res, next) => autoDubRouter(req, res, next));
  app.get('/voices', (req, res, next) => autoDubRouter(req, res, next));
  app.post('/translate', (req, res, next) => autoDubRouter(req, res, next));
  app.post('/tts/generate', (req, res, next) => autoDubRouter(req, res, next));
  app.post('/voice/design', (req, res, next) => autoDubRouter(req, res, next));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AutoDub Cloud server running on http://0.0.0.0:${port}`);
  });
}

startServer();

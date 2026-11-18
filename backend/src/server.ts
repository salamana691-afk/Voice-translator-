import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createAutoDubRouter } from './routes/autodubRoutes.ts';

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json({ limit: '256kb' }));

const router = createAutoDubRouter();
app.use('/', router);
app.use('/api', router);

app.listen(port, '0.0.0.0', () => {
  console.log(`AutoDub Cloud Backend listening on http://0.0.0.0:${port}`);
});

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestId } from './middleware/requestId.js';
import { apiRoutes } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(requestId);
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(Object.assign(new Error('Origin is not allowed.'), {
      statusCode: 403,
      code: 'ORIGIN_NOT_ALLOWED',
    }));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

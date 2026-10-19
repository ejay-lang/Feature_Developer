import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const providedId = req.get('x-request-id');
  const id = providedId && REQUEST_ID_PATTERN.test(providedId)
    ? providedId
    : randomUUID();

  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

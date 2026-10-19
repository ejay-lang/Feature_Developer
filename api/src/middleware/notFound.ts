import type { RequestHandler } from 'express';

export const notFound: RequestHandler = (req, _res, next) => {
  const error = new Error(`Route ${req.method} ${req.path} was not found.`);
  Object.assign(error, { statusCode: 404, code: 'ROUTE_NOT_FOUND' });
  next(error);
};

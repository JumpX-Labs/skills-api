import { createMiddleware } from 'hono/factory';

import { recordRequest } from '../metrics/request-stats.js';

export const requestMetricsMiddleware = createMiddleware(async (c, next) => {
  await next();
  recordRequest(c.req.path);
});

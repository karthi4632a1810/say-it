import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { sendError } from '../lib/response.js';

type Schemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      next();
    } catch (err: unknown) {
      const zodErr = err as { errors?: { path: (string | number)[]; message: string }[] };
      const fields: Record<string, string[]> = {};
      for (const e of zodErr.errors ?? []) {
        const key = e.path.join('.');
        fields[key] = fields[key] ?? [];
        fields[key].push(e.message);
      }
      sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, fields);
    }
  };
}

import type { RequestHandler } from "express";
import type { ZodType, z } from "zod";

type Schemas = { body?: ZodType; params?: ZodType; query?: ZodType };

// Validates and replaces req.body / req.params with the schema's output (trimmed, defaulted, typed). Express 5's
// req.query can't be reassigned, so a parsed query lands in res.locals.query. A failure becomes a 400 with the
// schema's own message (shared/errors.ts).
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    if (schemas.query) res.locals.query = schemas.query.parse(req.query);
    next();
  };
}

// The parsed body, typed by its schema.
export const bodyOf = <S extends ZodType>(req: { body: unknown }, _schema: S) => req.body as z.output<S>;

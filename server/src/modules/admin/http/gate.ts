import type { NextFunction, Request, Response } from "express";

import type { AuthClaims } from "../../../shared/auth/authenticate";
import { AppError } from "../../../shared/errors";

// After authenticate: only accounts with the `admin` custom claim (scripts/set-admin.ts) reach the admin API.
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!(req as Request & { auth?: AuthClaims }).auth?.admin) throw new AppError(403, "Admins only.");
  next();
}

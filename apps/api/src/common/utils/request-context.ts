import { Request } from 'express';

export interface AuditContext {
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function getAuditContext(req: Request): AuditContext {
  return {
    actorUserId: req.user?.id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  };
}

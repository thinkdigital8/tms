import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  if (err && typeof err === 'object' && 'name' in err && (err as Error).name === 'ValidationError') {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }

  if (err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate key conflict', details: (err as { keyValue?: unknown }).keyValue });
  }

  console.error('[unhandled error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({ success: false, message: env_isProd() ? 'Internal server error' : message });
}

function env_isProd() {
  return process.env.NODE_ENV === 'production';
}

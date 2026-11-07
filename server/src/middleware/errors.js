export class AppError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} was not found`, requestId: req.id } });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status ?? (err.name === 'ZodError' ? 400 : err.code === 'ER_DUP_ENTRY' ? 409 : 500);
  const message = status === 500 ? 'An unexpected server error occurred' : err.name === 'ZodError' ? 'Request validation failed' : err.code === 'ER_DUP_ENTRY' ? 'A record with this value already exists' : err.message;
  const details = err.details ?? (err.name === 'ZodError' ? err.issues?.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) : undefined);
  if (status === 500) console.error({ requestId: req.id, method: req.method, path: req.path, error: err });
  res.status(status).json({ error: { code: err.name === 'ZodError' ? 'VALIDATION_ERROR' : err.code ?? 'REQUEST_ERROR', message, ...(details ? { details } : {}), requestId: req.id } });
}

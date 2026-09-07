// src/core/errors.ts

export class CodexError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CodexError';
    Object.setPrototypeOf(this, CodexError.prototype);
  }
}

export function handleError(error: unknown): CodexError {
  if (error instanceof CodexError) {
    return error;
  }

  if (error instanceof Error) {
    return new CodexError('UNKNOWN_ERROR', error.message, {
      stack: error.stack,
      name: error.name
    });
  }

  return new CodexError('UNKNOWN_ERROR', String(error));
}

export function isCodexError(error: unknown): error is CodexError {
  return error instanceof CodexError;
}
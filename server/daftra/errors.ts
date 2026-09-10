export type DaftraErrorCode =
  | "DAFTRA_NOT_CONFIGURED"
  | "DAFTRA_AUTH_FAILED"
  | "DAFTRA_UNAVAILABLE"
  | "DAFTRA_TIMEOUT"
  | "DAFTRA_VALIDATION_ERROR"
  | "DAFTRA_NOT_FOUND"
  | "ENTITY_NOT_FOUND"
  | "AMBIGUOUS_ENTITY"
  | "CAPABILITY_DENIED"
  | "DUPLICATE_OPERATION"
  | "DAFTRA_WRITE_UNCERTAIN";

export class DaftraError extends Error {
  public readonly code: DaftraErrorCode;
  public readonly httpStatus?: number;
  public readonly details?: unknown;

  constructor(code: DaftraErrorCode, message: string, httpStatus?: number, details?: unknown) {
    super(message);
    this.name = "DaftraError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }

  public toEnvelopeData() {
    return {
      ok: false as const,
      domain: "daftra",
      code: this.code,
      error: this.message,
      httpStatus: this.httpStatus,
      details: this.details,
    };
  }
}

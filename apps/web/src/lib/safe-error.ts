export interface SafeErrorDetails {
  publicError: string;
  logMessage: string;
}

/**
 * Keeps implementation details in server logs while returning a stable public error.
 */
export function toSafeErrorDetails(error: unknown, publicError: string): SafeErrorDetails {
  return {
    publicError,
    logMessage: error instanceof Error ? error.message : 'Unknown error',
  };
}

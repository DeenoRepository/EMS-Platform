import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from './logger';

export interface SafeErrorDetails {
  publicError: string;
  logMessage: string;
  correlationId?: string;
}

/**
 * Keeps implementation details in server logs while returning a stable public error.
 */
export function toSafeErrorDetails(error: unknown, publicError: string): SafeErrorDetails {
  const correlationId = crypto.randomUUID();
  return {
    publicError,
    logMessage: error instanceof Error ? error.message : 'Unknown error',
    correlationId,
  };
}

/**
 * Logs the error on server and returns a sanitized JSON response to the client.
 */
export function safeErrorResponse(
  error: unknown,
  publicError: string = 'Внутренняя ошибка сервера',
  status: number = 500,
  context?: Record<string, unknown>
): NextResponse {
  const details = toSafeErrorDetails(error, publicError);
  logger.error(publicError, {
    error: details.logMessage,
    correlationId: details.correlationId,
    ...context,
  });

  return NextResponse.json(
    {
      success: false,
      error: details.publicError,
      correlationId: details.correlationId,
    },
    { status }
  );
}

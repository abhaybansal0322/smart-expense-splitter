export type LogContext = {
  request_id?: string;
  user_id?: string;
  group_id?: string;
  [key: string]: unknown;
};

class StructuredLogger {
  private formatLog(level: string, message: string, context?: LogContext, error?: unknown) {
    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    if (error) {
      if (error instanceof Error) {
        logEntry['error'] = { message: error.message, stack: error.stack, name: error.name };
      } else {
        logEntry['error'] = error;
      }
    }

    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatLog('INFO', message, context));
  }

  warn(message: string, context?: LogContext, error?: unknown) {
    console.warn(this.formatLog('WARN', message, context, error));
  }

  error(message: string, context?: LogContext, error?: unknown) {
    console.error(this.formatLog('ERROR', message, context, error));
  }
}

export const logger = new StructuredLogger();

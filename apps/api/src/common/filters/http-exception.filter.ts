import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  code: string;
  message: string;
  statusCode: number;
}

function extractCodeAndMessage(res: unknown, fallbackMessage: string): { code: string; message: string } {
  // Services throw HttpExceptions with a JSON-encoded { code } string as the message,
  // e.g. new NotFoundException(JSON.stringify({ code: 'post_not_found' }))
  if (typeof res === 'string') {
    try {
      const parsed = JSON.parse(res) as { code?: string; message?: string };
      if (parsed && typeof parsed.code === 'string') {
        return { code: parsed.code, message: parsed.message ?? parsed.code };
      }
    } catch {
      return { code: 'validation_error', message: res };
    }
    return { code: 'validation_error', message: res };
  }

  if (res && typeof res === 'object') {
    const obj = res as { code?: string; message?: string | string[] };
    if (typeof obj.code === 'string') {
      const msg = Array.isArray(obj.message) ? obj.message.join(', ') : (obj.message ?? obj.code);
      return { code: obj.code, message: msg };
    }
    if (typeof obj.message === 'string') {
      const parsed = tryParseCode(obj.message);
      if (parsed) return parsed;
      return { code: 'validation_error', message: obj.message };
    }
    if (Array.isArray(obj.message)) {
      return { code: 'validation_error', message: obj.message.join(', ') };
    }
  }

  return { code: 'internal_error', message: fallbackMessage };
}

function tryParseCode(raw: string): { code: string; message: string } | null {
  try {
    const parsed = JSON.parse(raw) as { code?: string; message?: string };
    if (parsed && typeof parsed.code === 'string') {
      return { code: parsed.code, message: parsed.message ?? parsed.code };
    }
  } catch {
    return null;
  }
  return null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = 'internal_error';
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      const extracted = extractCodeAndMessage(exception.getResponse(), exception.message);
      code = extracted.code;
      message = extracted.message;
      if (code === 'internal_error' && status === HttpStatus.UNAUTHORIZED) {
        code = 'auth_invalid_credentials';
      }
      if (code === 'validation_error' && status === HttpStatus.NOT_FOUND) {
        code = 'internal_error';
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: { error: ErrorBody } = {
      error: { code, message, statusCode: status },
    };

    response.status(status).json(body);
  }
}

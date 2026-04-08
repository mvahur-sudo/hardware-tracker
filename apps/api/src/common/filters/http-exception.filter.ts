import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    response.status(status).json({
      error: {
        statusCode: status,
        message:
          typeof payload === 'string'
            ? payload
            : ((payload as { message?: string | string[] }).message ?? payload),
        details: typeof payload === 'object' ? payload : undefined,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}

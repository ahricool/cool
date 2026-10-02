import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from './generated/prisma/client';
@Catch(Prisma.PrismaClientKnownRequestError)
export class DatabaseErrorFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const status =
      error.code === 'P2002'
        ? 409
        : error.code === 'P2025'
          ? 404
          : error.code === 'P2003'
            ? 400
            : 500;
    const message =
      status === 409
        ? 'Unique value already exists'
        : status === 404
          ? 'Resource not found'
          : status === 400
            ? 'Invalid related resource'
            : 'Database operation failed';
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}

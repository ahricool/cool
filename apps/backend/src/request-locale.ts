import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ContentLocale } from './localization';
export function requestLocale(
  request: Pick<Request, 'headers'>,
): ContentLocale {
  const saved = request.headers.cookie
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('cool_locale='))
    ?.slice('cool_locale='.length);
  if (saved === 'zh' || saved === 'en') return saved;
  return 'zh';
}
export const ReaderLocale = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const response = context.switchToHttp().getResponse<Response>();
    response.vary('Cookie');
    response.setHeader('Cache-Control', 'private, no-store');
    return requestLocale(context.switchToHttp().getRequest<Request>());
  },
);

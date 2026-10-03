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
  const languages = (request.headers['accept-language'] ?? '')
    .split(',')
    .map((item, index) => {
      const [language = '', quality] = item.trim().split(';');
      const weight = quality ? Number(quality.trim().replace(/^q=/, '')) : 1;
      return { language: language.toLowerCase(), weight, index };
    })
    .filter((item) => item.weight > 0 && item.weight <= 1)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { language } of languages) {
    if (/^zh(?:-(?:cn|sg|hans)(?:-|$)|$)/.test(language)) return 'zh';
    if (/^en(?:-|$)/.test(language)) return 'en';
  }
  return 'en';
}
export const ReaderLocale = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const response = context.switchToHttp().getResponse<Response>();
    response.vary('Accept-Language');
    response.vary('Cookie');
    response.setHeader('Cache-Control', 'private, no-store');
    return requestLocale(context.switchToHttp().getRequest<Request>());
  },
);

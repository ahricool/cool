import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ContentLocale, PostStatus } from './generated/prisma/enums';
export { ContentLocale };
export const locales = ['zh', 'en'] as const;
@Injectable()
export class LocalePipe implements PipeTransform<string, ContentLocale> {
  transform(value: string): ContentLocale {
    if (value !== 'zh' && value !== 'en')
      throw new BadRequestException('Unsupported content locale');
    return value;
  }
}
export const publishedTranslation = (now = new Date()) => ({
  status: 'PUBLISHED' as const,
  publishedAt: { lte: now },
});
export const visibleContent = (now = new Date()) => ({
  translations: { some: publishedTranslation(now) },
});
export function selectTranslation<T extends { locale: ContentLocale }>(
  translations: T[],
  locale: ContentLocale,
): T | undefined {
  return (
    translations.find((item) => item.locale === locale) ??
    translations.find((item) => item.locale !== locale)
  );
}
export function localize<
  T extends { translations: { locale: ContentLocale }[] },
>(
  item: T,
  locale: ContentLocale,
):
  | (Omit<T, 'translations'> &
      Omit<T['translations'][number], 'locale'> & {
        contentLocale: ContentLocale;
      })
  | null {
  const { translations, ...common } = item;
  const selected = selectTranslation(translations, locale);
  if (!selected) return null;
  const { locale: contentLocale, ...text } = selected;
  return { ...common, ...text, contentLocale } as Omit<T, 'translations'> &
    Omit<T['translations'][number], 'locale'> & {
      contentLocale: ContentLocale;
    };
}
export function publication(
  data: { status?: PostStatus; publishedAt?: string | null },
  current?: { status: PostStatus; publishedAt: Date | null },
) {
  const status = data.status ?? current?.status ?? 'DRAFT';
  const date =
    data.publishedAt === undefined
      ? current?.publishedAt
      : data.publishedAt
        ? new Date(data.publishedAt)
        : null;
  return {
    status,
    publishedAt: status === 'PUBLISHED' ? (date ?? new Date()) : (date ?? null),
  };
}

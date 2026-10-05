import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, ValidateIf } from 'class-validator';
import { ADMIN_EMAIL, normalizeOwner } from './auth.constants';
import { publicUser } from './auth';
import { Database } from './database';
import { Prisma, ContentLocale } from './generated/prisma/client';
import { ReaderLocale } from './request-locale';
import { articlePreview } from './preview';
class TimelineQuery {
  @ApiPropertyOptional()
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  cursor?: string;
}
type Cursor = {
  locale: ContentLocale;
  asOf: string;
  publishedAt: string;
  kind: 'post' | 'moment';
  id: string;
};
type Row = {
  id: string;
  kind: 'post' | 'moment';
  slug: string | null;
  coverUrl: string | null;
  title: string | null;
  content: string;
  contentLocale: ContentLocale;
  publishedAt: string;
};
function decodeCursor(
  value: string | undefined,
  locale: ContentLocale,
): Cursor | undefined {
  if (!value) return;
  try {
    const cursor = JSON.parse(
      Buffer.from(value, 'base64url').toString(),
    ) as Cursor;
    if (
      cursor.locale !== locale ||
      !['post', 'moment'].includes(cursor.kind) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        cursor.id,
      ) ||
      !/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d(?::?\d\d)?)$/.test(
        cursor.publishedAt,
      ) ||
      !Number.isFinite(Date.parse(cursor.asOf)) ||
      Date.parse(cursor.asOf) > Date.now() ||
      !Number.isFinite(Date.parse(cursor.publishedAt)) ||
      Date.parse(cursor.publishedAt) > Date.parse(cursor.asOf)
    )
      throw new Error();
    return cursor;
  } catch {
    throw new BadRequestException('Invalid timeline cursor');
  }
}
@ApiTags('Public timeline')
@Controller('public/timeline')
export class TimelineController {
  constructor(private readonly db: Database) {}
  @Get() async list(
    @ReaderLocale() locale: ContentLocale,
    @Query() query: TimelineQuery,
  ) {
    const cursor = decodeCursor(query.cursor, locale);
    const asOf = cursor?.asOf ?? new Date().toISOString();
    const rows = await this.db.$queryRaw<Row[]>(Prisma.sql`
      WITH feed AS (
        SELECT p.id, 'post'::text AS kind, p.slug, p.cover_url AS "coverUrl", t.title, t.content, t.locale AS "contentLocale", t.published_at
        FROM posts p JOIN LATERAL (
          SELECT * FROM post_translations WHERE post_id=p.id AND status='PUBLISHED' AND published_at <= ${asOf}::timestamptz
          ORDER BY (locale::text=${locale}) DESC LIMIT 1
        ) t ON TRUE
        UNION ALL
        SELECT m.id, 'moment'::text, NULL, NULL, NULL, t.content, t.locale, t.published_at
        FROM moments m JOIN LATERAL (
          SELECT * FROM moment_translations WHERE moment_id=m.id AND status='PUBLISHED' AND published_at <= ${asOf}::timestamptz
          ORDER BY (locale::text=${locale}) DESC LIMIT 1
        ) t ON TRUE
      )
      SELECT id,kind,slug,"coverUrl",title,content,"contentLocale",published_at::text AS "publishedAt" FROM feed
      ${cursor ? Prisma.sql`WHERE (published_at,kind COLLATE "C",id) < (${cursor.publishedAt}::timestamptz,${cursor.kind}::text COLLATE "C",${cursor.id}::uuid)` : Prisma.empty}
      ORDER BY published_at DESC,kind COLLATE "C" DESC,id DESC LIMIT 11
    `);
    const author = await this.db.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: publicUser,
    });
    const items = rows.slice(0, 10).map(({ content, ...row }) => ({
      ...row,
      publishedAt: new Date(row.publishedAt).toISOString(),
      author: author ? normalizeOwner(author) : null,
      ...(row.kind === 'post'
        ? { excerpt: articlePreview(content) }
        : { content }),
    }));
    const last = rows[9];
    return {
      items,
      nextCursor:
        rows.length > 10 && last
          ? Buffer.from(
              JSON.stringify({
                locale,
                asOf,
                publishedAt: last.publishedAt,
                kind: last.kind,
                id: last.id,
              }),
            ).toString('base64url')
          : null,
    };
  }
}

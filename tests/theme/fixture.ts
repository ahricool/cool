import { serializeMediaGroup } from '../../packages/content/src/index';
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import {
  defaultAppearance,
  defaultHomepage,
  defaultSite,
  type AdminSettings,
} from '../../packages/content/src/types';

export async function themeFixture(
  page: Page,
  appearance: Record<string, unknown> = {},
) {
  const state = {
    settings: {
      site: {
        commentsEnabled: true,
        appearance: { ...defaultAppearance, ...appearance },
        translations: [
          {
            locale: 'zh',
            title: '梦桜',
            description: '合成数据',
            authorBio: '测试作者',
          },
          {
            locale: 'en',
            title: '梦桜',
            description: 'Synthetic data',
            authorBio: 'Test owner',
          },
        ],
      },
      homepage: {
        coverUrl: '/api/v1/media/fixture.webp',
        focusMode: 'glitch-text',
        wave: false,
        translations: [
          {
            locale: 'zh',
            greeting: '测试首页',
            description: '合成数据',
            notice: '',
          },
          {
            locale: 'en',
            greeting: 'Test homepage',
            description: 'Synthetic data',
            notice: '',
          },
        ],
      },
    },
    writes: [] as AdminSettings[],
    showMoment: false,
    richContent: false,
    avatarUrl: '/api/v1/media/fixture.webp' as string | null,
    timelinePages: 1,
    timelineFailures: new Set<string>(),
    timelineRepeatCursor: false,
    timelineQueries: [] as { cursor: string | null; language: string }[],
    requests: [] as string[],
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    state.requests.push(path);
    const language = /(?:^|; )cool_locale=en(?:;|$)/.test(
      request.headers()['cookie'] ?? '',
    )
      ? 'en'
      : 'zh';
    const localized = (rows: { locale: string }[]) =>
      rows.find((row) => row.locale === language) ?? rows[0];
    const post = {
      kind: 'post',
      type: 'ARTICLE',
      id: 'fixture-post',
      slug: 'fixture-post',
      title:
        language === 'en'
          ? 'Synthetic article: a spring story'
          : '合成文章：春天的故事',
      excerpt: '中文与 English 的测试正文。',
      coverUrl: '/api/v1/media/fixture.webp',
      publishedAt: '2026-10-01T08:00:00.000Z',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
      author: {
        id: 'synthetic-owner',
        displayName: '合成作者',
        avatarUrl: state.avatarUrl,
      },
      contentLocale: language,
      content:
        '# Synthetic heading\n\n中文与 English 的测试正文。\n\n![Test media](/api/v1/media/00000000-0000-0000-0000-000000000000.webp)\n\n```ts\nconst theme = true;\n```',
      tags: [
        {
          tag: {
            id: 'fixture-tag',
            slug: 'spring',
            name: language === 'en' ? 'Spring' : '春天',
            contentLocale: language,
          },
        },
      ],
      viewCount: 1,
      commentCount: 0,
    };
    if (state.richContent) {
      post.content +=
        '\n\n## Media and table\n\n| Item | Value |\n| --- | --- |\n| Width | Safe |\n\n' +
        serializeMediaGroup({
          layout: 'grid',
          assets: [
            {
              id: '00000000-0000-0000-0000-000000000001',
              url: '/api/v1/media/00000000-0000-0000-0000-000000000001.mp4',
              name: 'Synthetic video',
              mimeType: 'video/mp4',
            },
          ],
        });
    }
    if (path === '/media/00000000-0000-0000-0000-000000000001.mp4') {
      // Verify safe video markup/controls without fetching any external media.
      await route.fulfill({ status: 204, contentType: 'video/mp4', body: '' });
      return;
    }
    if (
      path === '/media/fixture.webp' ||
      path === '/media/00000000-0000-0000-0000-000000000000.webp'
    ) {
      await route.fulfill({
        contentType: 'image/webp',
        body: await readFile(
          'apps/frontend/public/sakura/images/default/hd.webp',
        ),
      });
      return;
    }
    let json: unknown;
    if (path === '/admin/auth/session') {
      json = {
        user: {
          id: 'synthetic-owner',
          email: 'whoreahri@gmail.com',
          displayName: '合成作者',
          avatarUrl: state.avatarUrl,
        },
        csrfToken: 'synthetic-csrf',
      };
    } else if (path === '/admin/settings') {
      if (request.method() === 'PUT') {
        const body = request.postDataJSON() as AdminSettings;
        state.writes.push(body);
        state.settings = body;
      }
      json = state.settings;
    } else if (path === '/public/site') {
      json = {
        ...defaultSite,
        ...localized(state.settings.site.translations),
        author: {
          displayName: '合成作者',
          avatarUrl: state.avatarUrl,
        },
        appearance: state.settings.site.appearance,
      };
    } else if (path === '/public/config') {
      json = {
        homepage: {
          ...defaultHomepage,
          ...state.settings.homepage,
          ...localized(state.settings.homepage.translations),
        },
      };
    } else if (path === '/public/timeline') {
      const cursor = new URL(request.url()).searchParams.get('cursor');
      state.timelineQueries.push({ cursor, language });
      if (state.timelineFailures.has(cursor ?? 'first')) {
        await route.fulfill({
          status: 503,
          json: { message: 'Synthetic timeline failure' },
        });
        return;
      }
      const pageIndex = cursor ? Number(cursor) : 0;
      json = {
        items: [
          {
            ...post,
            id: pageIndex ? `${post.id}-${pageIndex}` : post.id,
            title: pageIndex ? `${post.title} ${pageIndex + 1}` : post.title,
          },
          ...(state.showMoment
            ? [
                {
                  kind: 'moment',
                  id: `fixture-moment-${pageIndex}`,
                  content: 'Synthetic moment 中文',
                  publishedAt: post.publishedAt,
                  author: null,
                  contentLocale: language,
                },
              ]
            : []),
        ],
        nextCursor:
          pageIndex + 1 < state.timelinePages
            ? String(
                state.timelineRepeatCursor && cursor
                  ? pageIndex
                  : pageIndex + 1,
              )
            : null,
      };
    } else if (path === '/public/posts/fixture-post') {
      json = post;
    } else if (
      path === '/public/pages/fixture-page' ||
      path === '/public/about'
    ) {
      json = {
        id: 'fixture-page',
        slug: 'fixture-page',
        title: language === 'en' ? 'Synthetic page' : '合成页面',
        content: post.content,
        coverUrl: post.coverUrl,
        publishedAt: post.publishedAt,
        contentLocale: language,
      };
    } else if (path === '/public/tags') {
      json = post.tags.map((row) => row.tag);
    } else if (
      path === '/public/search' ||
      path === '/public/tags/spring/posts'
    ) {
      const pageNumber = Number(
        new URL(request.url()).searchParams.get('page') ?? 1,
      );
      json = { items: [post], total: 9, page: pageNumber, pageSize: 8 };
    } else {
      // Fail unexpected API use rather than contact a real service.
      await route.fulfill({
        status: 404,
        json: { message: `Unmocked synthetic endpoint: ${path}` },
      });
      return;
    }
    await route.fulfill({ json });
  });
  return state;
}

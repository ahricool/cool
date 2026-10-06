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
  };
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === '/media/fixture.webp') {
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
          avatarUrl: '/api/v1/media/fixture.webp',
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
        ...state.settings.site.translations[0],
        author: {
          displayName: '合成作者',
          avatarUrl: '/api/v1/media/fixture.webp',
        },
        appearance: state.settings.site.appearance,
      };
    } else if (path === '/public/config') {
      json = {
        homepage: {
          ...defaultHomepage,
          ...state.settings.homepage,
          ...state.settings.homepage.translations[0],
        },
      };
    } else if (path === '/public/timeline') {
      json = {
        items: [
          {
            kind: 'post',
            id: 'fixture-post',
            slug: 'fixture-post',
            title: '合成文章：春天的故事',
            excerpt: '中文与 English 的测试正文。',
            coverUrl: '/api/v1/media/fixture.webp',
            publishedAt: '2026-10-01T08:00:00.000Z',
            author: {
              id: 'synthetic-owner',
              displayName: '合成作者',
              avatarUrl: '/api/v1/media/fixture.webp',
            },
            contentLocale: 'zh',
          },
        ],
        nextCursor: null,
      };
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

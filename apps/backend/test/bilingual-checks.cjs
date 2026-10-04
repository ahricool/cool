/* global module */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
module.exports = async function verifyBilingual(t, http, token) {
  const prefix = `bilingual-${randomUUID()}`;
  const admin = (method, path, body) => {
    const req = http[method]('/api/v1/admin/' + path).auth(token, {
      type: 'bearer',
    });
    return body === undefined ? req : req.send(body);
  };
  const read = (locale, resource) =>
    http
      .get(`/api/v1/public/${resource}`)
      .set('Cookie', `cool_locale=${locale}`);
  const created = [];
  const create = async (kind, body) => {
    const item = (await admin('post', kind, body).expect(201)).body;
    created.push([kind, item.id]);
    return item;
  };
  const zh = (title, extra = {}) => ({
    locale: 'zh',
    title,
    content: '# 中文 Markdown\n\n```ts\nconst x = 1\n```',
    status: 'PUBLISHED',
    ...extra,
  });
  try {
    await t.test(
      'missing, draft, archived and scheduled translations fall back only to a published language',
      async () => {
        const post = await create('posts', {
          slug: prefix,
          translations: [zh(prefix)],
        });
        for (const locale of ['zh', 'en']) {
          const detail = (await read(locale, `posts/${prefix}`).expect(200))
            .body;
          assert.equal(detail.id, post.id);
          assert.equal(detail.contentLocale, 'zh');
          assert.equal(detail.content, post.translations[0].content);
          for (const key of ['translations', 'status', 'postId'])
            assert.equal(detail[key], undefined);
        }
        await admin('put', `posts/${post.id}`, {
          translations: [
            {
              locale: 'en',
              title: 'PrivateEnglishSecret',
              content: 'Do not reveal this unpublished text',
              status: 'DRAFT',
            },
          ],
        }).expect(200);
        assert.equal(
          (await read('en', `posts/${prefix}`)).body.contentLocale,
          'zh',
        );
        assert.equal(
          (await read('en', 'search?q=PrivateEnglishSecret')).body.total,
          0,
        );
        await admin('put', `posts/${post.id}`, {
          translations: [
            {
              locale: 'en',
              status: 'PUBLISHED',
              publishedAt: '2099-01-01T00:00:00Z',
            },
          ],
        }).expect(200);
        assert.equal(
          (await read('en', `posts/${prefix}`)).body.contentLocale,
          'zh',
        );
        await admin('put', `posts/${post.id}`, {
          translations: [{ locale: 'en', status: 'ARCHIVED' }],
        }).expect(200);
        assert.equal(
          (await read('en', `posts/${prefix}`)).body.contentLocale,
          'zh',
        );
        await admin('put', `posts/${post.id}`, {
          translations: [{ locale: 'zh', status: 'DRAFT' }],
        }).expect(200);
        for (const locale of ['zh', 'en']) {
          await read(locale, `posts/${prefix}`).expect(404);
          await read(locale, `posts/${prefix}/comments`).expect(404);
          assert.equal((await read(locale, `posts?q=${prefix}`)).body.total, 0);
          assert.equal(
            (await read(locale, `archives?q=${prefix}`)).body.total,
            0,
          );
        }
        for (const translations of [
          [null],
          [{ locale: 'fr', title: 'Invalid' }],
          [],
          null,
        ])
          await admin('post', 'posts', {
            slug: prefix + '-bad-locale',
            translations,
          }).expect(400);
        await read('fr', 'posts').expect(200);
        await http.get('/api/v1/public/posts').expect(200);
        await admin('put', `posts/${post.id}`, {
          translations: [{ title: 'Missing locale' }],
        }).expect(400);
        await admin('put', `posts/${post.id}`, {
          translations: [{ locale: 'en', status: null }],
        }).expect(400);
        await admin('post', 'posts', {
          slug: prefix + '-invalid',
          translations: [zh('One'), zh('Two')],
        }).expect(400);
      },
    );
    await t.test(
      'search, taxonomy filters, archives, pagination and counts use the selected translation once per logical post',
      async () => {
        const category = await create('categories', {
          slug: prefix,
          translations: [
            { locale: 'zh', name: '分类' },
            { locale: 'en', name: 'Category' },
          ],
        });
        const tag = await create('tags', {
          slug: prefix,
          translations: [{ locale: 'zh', name: '标签' }],
        });
        const first = await create('posts', {
          slug: prefix + '-first',
          categoryIds: [category.id],
          tagIds: [tag.id],
          translations: [
            zh(prefix + ' zhOnlyNeedle', {
              publishedAt: '2025-01-01T00:00:00Z',
            }),
            {
              locale: 'en',
              title: prefix + ' EnglishNeedle',
              content: 'Visible English',
              status: 'PUBLISHED',
              publishedAt: '2026-01-01T00:00:00Z',
            },
          ],
        });
        const second = await create('posts', {
          slug: prefix + '-second',
          categoryIds: [category.id],
          tagIds: [tag.id],
          translations: [
            zh(prefix + ' FallbackNeedle', {
              publishedAt: '2025-06-01T00:00:00Z',
            }),
          ],
        });
        for (const locale of ['zh', 'en']) {
          const page1 = (
            await read(
              locale,
              `posts?category=${prefix}&tag=${prefix}&pageSize=1`,
            )
          ).body;
          const page2 = (
            await read(
              locale,
              `posts?category=${prefix}&tag=${prefix}&pageSize=1&page=2`,
            )
          ).body;
          for (const taxonomy of ['categories', 'tags']) {
            const scoped = (
              await read(locale, `${taxonomy}/${prefix}/posts?pageSize=1`)
            ).body;
            assert.equal(scoped.total, 2);
            assert.equal(scoped.items[0].id, page1.items[0].id);
            assert.equal(
              (
                await read(
                  locale,
                  `${taxonomy}/${prefix}/posts?q=FallbackNeedle`,
                )
              ).body.total,
              1,
            );
          }
          assert.equal(page1.total, 2);
          assert.equal(page2.total, 2);
          assert.notEqual(page1.items[0].id, page2.items[0].id);
          assert.equal(
            page1.items[0].id,
            locale === 'en' ? first.id : second.id,
          );
          assert.equal(page1.items[0].content, undefined);
          assert.equal(
            (await read(locale, `archives?category=${prefix}&pageSize=1`)).body
              .total,
            2,
          );
          assert.equal(
            (await read(locale, `posts?category=${prefix}&page=3&pageSize=1`))
              .body.items.length,
            0,
          );
        }
        assert.equal((await read('en', 'search?q=zhOnlyNeedle')).body.total, 0);
        assert.equal(
          (await read('zh', 'search?q=EnglishNeedle')).body.total,
          0,
        );
        assert.equal(
          (await read('en', 'search?q=FallbackNeedle')).body.total,
          1,
        );
        const categories = (await read('en', 'categories')).body;
        assert.equal(
          categories.find((row) => row.id === category.id).name,
          'Category',
        );
        assert.equal(
          (await read('en', 'tags')).body.find((row) => row.id === tag.id)
            .contentLocale,
          'zh',
        );
        await admin('put', `posts/${first.id}`, {
          translations: [{ locale: 'en', status: 'DRAFT' }],
        }).expect(200);
        assert.equal((await read('en', 'search?q=zhOnlyNeedle')).body.total, 1);
        assert.equal(
          (await read('en', 'search?q=EnglishNeedle')).body.total,
          0,
        );
        const saved = (await admin('get', `posts/${first.id}`)).body;
        assert.equal(
          saved.translations.find((row) => row.locale === 'zh').status,
          'PUBLISHED',
        );
        assert.equal(
          saved.translations.find((row) => row.locale === 'en').status,
          'DRAFT',
        );
        await admin('delete', `posts/${first.id}/translations/zh`).expect(200);
        await read('en', `posts/${first.slug}`).expect(404);
        assert.equal(
          (await read('en', `posts?category=${prefix}`)).body.total,
          1,
        );
        assert.equal(
          (await admin('get', `posts/${first.id}`)).body.translations.length,
          1,
        );
      },
    );
    await t.test(
      'page translations update and delete independently without exposing draft Markdown',
      async () => {
        const page = await create('pages', {
          slug: prefix,
          translations: [
            {
              locale: 'en',
              title: 'English page',
              content: '# Visible English',
              status: 'PUBLISHED',
            },
          ],
        });
        assert.equal(
          (await read('zh', `pages/${prefix}`)).body.contentLocale,
          'en',
        );
        await admin('put', `pages/${page.id}`, {
          translations: [
            {
              locale: 'zh',
              title: '中文草稿',
              content: '# Private page',
              status: 'DRAFT',
            },
          ],
        }).expect(200);
        assert.equal(
          (await read('zh', `pages/${prefix}`)).body.content,
          '# Visible English',
        );
        await admin('put', `pages/${page.id}`, {
          translations: [{ locale: 'zh', status: 'PUBLISHED' }],
        }).expect(200);
        assert.equal(
          (await read('zh', `pages/${prefix}`)).body.contentLocale,
          'zh',
        );
        assert.equal(
          (await read('en', `pages/${prefix}`)).body.contentLocale,
          'en',
        );
        await admin('delete', `pages/${page.id}/translations/en`).expect(200);
        assert.equal(
          (await read('en', `pages/${prefix}`)).body.contentLocale,
          'zh',
        );
        await admin('put', `pages/${page.id}`, {
          translations: [{ locale: 'en', status: 'PUBLISHED' }],
        }).expect(400);
        await admin('delete', `pages/${page.id}/translations/zh`).expect(200);
        await read('zh', `pages/${prefix}`).expect(404);
      },
    );
    await t.test(
      'moments and photos localize text while keeping shared identity and URLs',
      async () => {
        const moment = await create('moments', {
          translations: [
            { locale: 'zh', content: '中文时刻', status: 'PUBLISHED' },
            {
              locale: 'en',
              content: 'Private English moment',
              status: 'DRAFT',
            },
          ],
        });
        let result = (await read('en', 'moments')).body;
        assert.equal(
          result.items.find((row) => row.id === moment.id).contentLocale,
          'zh',
        );
        assert.ok(!JSON.stringify(result).includes('Private English moment'));
        await admin('put', `moments/${moment.id}`, {
          translations: [{ locale: 'en', status: 'PUBLISHED' }],
        }).expect(200);
        result = (await read('en', 'moments')).body;
        assert.equal(
          result.items.filter((row) => row.id === moment.id).length,
          1,
        );
        assert.equal(
          result.items.find((row) => row.id === moment.id).contentLocale,
          'en',
        );
        const photo = await create('photos', {
          url: '/sakura/images/default/hd.webp',
          published: true,
          translations: [
            {
              locale: 'zh',
              title: '中文照片',
              description: '说明',
              album: '相册',
            },
          ],
        });
        assert.equal(
          (await read('en', 'photos')).body.items.find(
            (row) => row.id === photo.id,
          ).title,
          '中文照片',
        );
        await admin('put', `photos/${photo.id}`, {
          translations: [
            {
              locale: 'en',
              title: 'English photo',
              description: 'Caption',
              album: 'Album',
            },
          ],
        }).expect(200);
        assert.equal(
          (await read('en', 'photos')).body.items.find(
            (row) => row.id === photo.id,
          ).url,
          photo.url,
        );
        assert.equal(
          (await read('zh', 'photos')).body.items.find(
            (row) => row.id === photo.id,
          ).title,
          '中文照片',
        );
      },
    );
    await t.test(
      'site and homepage text use bilingual fallback without duplicating shared assets or leaking private settings',
      async () => {
        const original = (await admin('get', 'settings')).body;
        const settings = {
          site: {
            authorName: 'Shared owner',
            avatarUrl: original.site.avatarUrl,
            commentsEnabled: true,
            appearance: {
              font: 'bubble-candy',
              fontSize: 115,
              avatar: 'star',
              cover: 'heart',
              background: 'none',
            },
            translations: [
              {
                locale: 'zh',
                title: '中文站点',
                description: '中文说明',
                authorBio: '中文简介',
              },
            ],
          },
          homepage: {
            coverUrl: original.homepage.coverUrl,
            focusMode: 'avatar',
            wave: true,
            translations: [
              {
                locale: 'en',
                greeting: 'Hello',
                description: 'Intro',
                notice: 'Notice',
              },
            ],
          },
        };
        try {
          await admin('put', 'settings', settings).expect(200);
          const site = (await read('en', 'site')).body;
          assert.equal(site.title, '中文站点');
          assert.equal(site.contentLocale, 'zh');
          assert.equal(site.authorName, 'Shared owner');
          assert.deepEqual(site.appearance, settings.site.appearance);
          assert.deepEqual(
            (await admin('get', 'settings')).body.site.appearance,
            settings.site.appearance,
          );
          await admin('put', 'settings', {
            ...settings,
            site: {
              ...settings.site,
              appearance: {
                avatar: 'invalid',
                cover: 'dot',
                background: 'none',
              },
            },
          }).expect(400);
          await admin('put', 'settings', {
            ...settings,
            site: {
              ...settings.site,
              appearance: { ...settings.site.appearance, fontSize: 116 },
            },
          }).expect(400);
          assert.equal(site.translations, undefined);
          const config = (await read('zh', 'config')).body;
          assert.equal(config.homepage.greeting, 'Hello');
          assert.equal(config.homepage.contentLocale, 'en');
          assert.equal(Object.hasOwn(config, 'social'), false);
          await admin('put', 'settings', {
            ...settings,
            site: { ...settings.site, translations: [] },
          }).expect(400);
        } finally {
          await admin('put', 'settings', original).expect(200);
        }
      },
    );
  } finally {
    for (const [kind, id] of created.reverse())
      await admin('delete', `${kind}/${id}`).expect(200);
  }
};

import { query } from "./db.js";
import { cleanPostPayload, normalizePage, slugify } from "./utils.js";

const postSelect = `
  SELECT
    p.id,
    p.title,
    p.slug,
    p.excerpt,
    p.content,
    p.cover_url AS "coverUrl",
    p.status,
    p.published_at AS "publishedAt",
    p.view_count AS "viewCount",
    p.like_count AS "likeCount",
    p.created_at AS "createdAt",
    p.updated_at AS "updatedAt",
    jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatarUrl', u.avatar_url) AS author,
    jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description) AS category,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
      FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS tags
  FROM posts p
  LEFT JOIN users u ON u.id = p.author_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN post_tags pt ON pt.post_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
`;

function postGroupOrder(orderBy = "p.created_at DESC") {
  return `
    GROUP BY p.id, u.id, c.id
    ORDER BY ${orderBy}
  `;
}

async function syncPostTags(postId, tagIds) {
  await query("DELETE FROM post_tags WHERE post_id = $1", [postId]);
  if (!tagIds.length) return;
  await query(
    `INSERT INTO post_tags (post_id, tag_id)
     SELECT $1, unnest($2::uuid[])
     ON CONFLICT DO NOTHING`,
    [postId, tagIds]
  );
}

async function getDefaultAuthorId() {
  const result = await query("SELECT id FROM users ORDER BY created_at LIMIT 1");
  return result.rows[0]?.id || null;
}

export async function registerRoutes(app) {
  app.get("/health", async () => ({ ok: true, service: "cool-cms-api" }));

  app.get("/api/site", async () => {
    const result = await query("SELECT value FROM site_settings WHERE key = 'site'");
    return result.rows[0]?.value || {};
  });

  app.put("/api/site", async (request) => {
    const value = request.body || {};
    const result = await query(
      `INSERT INTO site_settings (key, value)
       VALUES ('site', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(value)]
    );
    return result.rows[0].value;
  });

  app.get("/api/dashboard", async () => {
    const [posts, published, drafts, categories, tags, views] = await Promise.all([
      query("SELECT count(*)::int AS count FROM posts"),
      query("SELECT count(*)::int AS count FROM posts WHERE status = 'published'"),
      query("SELECT count(*)::int AS count FROM posts WHERE status = 'draft'"),
      query("SELECT count(*)::int AS count FROM categories"),
      query("SELECT count(*)::int AS count FROM tags"),
      query("SELECT COALESCE(sum(view_count), 0)::int AS count FROM posts"),
    ]);
    return {
      posts: posts.rows[0].count,
      published: published.rows[0].count,
      drafts: drafts.rows[0].count,
      categories: categories.rows[0].count,
      tags: tags.rows[0].count,
      views: views.rows[0].count,
    };
  });

  app.get("/api/posts", async (request) => {
    const { page, limit, offset } = normalizePage(request.query);
    const filters = [];
    const params = [];

    if (request.query.status) {
      params.push(request.query.status);
      filters.push(`p.status = $${params.length}`);
    }
    if (request.query.q) {
      params.push(`%${request.query.q}%`);
      filters.push(`(p.title ILIKE $${params.length} OR p.excerpt ILIKE $${params.length} OR p.content ILIKE $${params.length})`);
    }
    if (request.query.category) {
      params.push(request.query.category);
      filters.push(`c.slug = $${params.length}`);
    }
    if (request.query.tag) {
      params.push(request.query.tag);
      filters.push(`EXISTS (
        SELECT 1 FROM post_tags tag_filter
        JOIN tags tf ON tf.id = tag_filter.tag_id
        WHERE tag_filter.post_id = p.id AND tf.slug = $${params.length}
      )`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const countResult = await query(
      `SELECT count(DISTINCT p.id)::int AS total
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}`,
      params
    );
    const dataResult = await query(
      `${postSelect}
       ${where}
       ${postGroupOrder("COALESCE(p.published_at, p.created_at) DESC")}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      items: dataResult.rows,
      page,
      limit,
      total: countResult.rows[0].total,
      totalPages: Math.ceil(countResult.rows[0].total / limit),
    };
  });

  app.get("/api/posts/:slug", async (request, reply) => {
    const result = await query(
      `${postSelect}
       WHERE p.slug = $1 OR p.id::text = $1
       ${postGroupOrder("p.created_at DESC")}
       LIMIT 1`,
      [request.params.slug]
    );
    const post = result.rows[0];
    if (!post) return reply.code(404).send({ message: "Post not found" });
    await query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1", [post.id]);
    return { ...post, viewCount: post.viewCount + 1 };
  });

  app.post("/api/posts", async (request, reply) => {
    const payload = cleanPostPayload(request.body);
    if (!payload.title || !payload.slug) {
      return reply.code(400).send({ message: "title is required" });
    }
    const authorId = await getDefaultAuthorId();
    const result = await query(
      `INSERT INTO posts (title, slug, excerpt, content, cover_url, status, author_id, category_id, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $6 = 'published' THEN now() ELSE NULL END)
       RETURNING id, slug`,
      [
        payload.title,
        payload.slug,
        payload.excerpt,
        payload.content,
        payload.coverUrl,
        payload.status,
        authorId,
        payload.categoryId,
      ]
    );
    await syncPostTags(result.rows[0].id, payload.tagIds);
    reply.code(201);
    return { id: result.rows[0].id, slug: result.rows[0].slug };
  });

  app.put("/api/posts/:id", async (request, reply) => {
    const payload = cleanPostPayload(request.body);
    if (!payload.title || !payload.slug) {
      return reply.code(400).send({ message: "title is required" });
    }
    const result = await query(
      `UPDATE posts
       SET title = $1,
           slug = $2,
           excerpt = $3,
           content = $4,
           cover_url = $5,
           status = $6,
           category_id = $7,
           published_at = CASE
             WHEN $6 = 'published' AND published_at IS NULL THEN now()
             WHEN $6 != 'published' THEN NULL
             ELSE published_at
           END,
           updated_at = now()
       WHERE id = $8
       RETURNING id, slug`,
      [
        payload.title,
        payload.slug,
        payload.excerpt,
        payload.content,
        payload.coverUrl,
        payload.status,
        payload.categoryId,
        request.params.id,
      ]
    );
    if (!result.rowCount) return reply.code(404).send({ message: "Post not found" });
    await syncPostTags(request.params.id, payload.tagIds);
    return result.rows[0];
  });

  app.delete("/api/posts/:id", async (request, reply) => {
    const result = await query("DELETE FROM posts WHERE id = $1", [request.params.id]);
    if (!result.rowCount) return reply.code(404).send({ message: "Post not found" });
    reply.code(204);
  });

  app.post("/api/posts/:id/publish", async (request, reply) => {
    const result = await query(
      `UPDATE posts SET status = 'published', published_at = COALESCE(published_at, now()), updated_at = now()
       WHERE id = $1 RETURNING id, slug`,
      [request.params.id]
    );
    if (!result.rowCount) return reply.code(404).send({ message: "Post not found" });
    return result.rows[0];
  });

  app.post("/api/posts/:id/like", async (request, reply) => {
    const result = await query(
      "UPDATE posts SET like_count = like_count + 1 WHERE id = $1 RETURNING like_count AS \"likeCount\"",
      [request.params.id]
    );
    if (!result.rowCount) return reply.code(404).send({ message: "Post not found" });
    return result.rows[0];
  });

  app.get("/api/categories", async () => {
    const result = await query(
      `SELECT c.id, c.name, c.slug, c.description, count(p.id)::int AS "postCount"
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    return result.rows;
  });

  app.post("/api/categories", async (request, reply) => {
    const name = String(request.body?.name || "").trim();
    if (!name) return reply.code(400).send({ message: "name is required" });
    const result = await query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, slug, description`,
      [name, slugify(request.body?.slug || name), request.body?.description || ""]
    );
    reply.code(201);
    return result.rows[0];
  });

  app.get("/api/tags", async () => {
    const result = await query(
      `SELECT t.id, t.name, t.slug, count(pt.post_id)::int AS "postCount"
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name`
    );
    return result.rows;
  });

  app.post("/api/tags", async (request, reply) => {
    const name = String(request.body?.name || "").trim();
    if (!name) return reply.code(400).send({ message: "name is required" });
    const result = await query(
      "INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id, name, slug",
      [name, slugify(request.body?.slug || name)]
    );
    reply.code(201);
    return result.rows[0];
  });

  app.get("/api/media", async () => {
    const result = await query("SELECT id, url, alt, type, created_at AS \"createdAt\" FROM media_assets ORDER BY created_at DESC");
    return result.rows;
  });

  app.post("/api/media", async (request, reply) => {
    const url = String(request.body?.url || "").trim();
    if (!url) return reply.code(400).send({ message: "url is required" });
    const result = await query(
      "INSERT INTO media_assets (url, alt, type) VALUES ($1, $2, $3) RETURNING id, url, alt, type",
      [url, request.body?.alt || "", request.body?.type || "image"]
    );
    reply.code(201);
    return result.rows[0];
  });
}

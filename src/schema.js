export const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  published_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_status_published_at ON posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING gin (to_tsvector('simple', title || ' ' || excerpt || ' ' || content));
`;

export const seedSql = `
INSERT INTO users (name, email, avatar_url)
VALUES ('CMS Admin', 'admin@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, slug, description)
VALUES
  ('产品动态', 'product', '产品更新、功能发布和路线图记录'),
  ('工程实践', 'engineering', '架构、研发流程和技术复盘'),
  ('运营笔记', 'operations', '内容运营、增长和用户研究')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tags (name, slug)
VALUES
  ('Vue3', 'vue3'),
  ('Fastify', 'fastify'),
  ('PostgreSQL', 'postgresql'),
  ('CMS', 'cms')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO site_settings (key, value)
VALUES (
  'site',
  '{
    "title": "Cool CMS",
    "subtitle": "一个 Vue3 + Fastify 的前后端分离内容系统",
    "description": "管理文章、分类、标签和站点配置。",
    "logo": "",
    "heroImage": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

WITH admin AS (
  SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1
), category AS (
  SELECT id FROM categories WHERE slug = 'engineering' LIMIT 1
), inserted AS (
  INSERT INTO posts (title, slug, excerpt, content, cover_url, status, author_id, category_id, published_at, view_count, like_count)
  SELECT
    '从 Halo 主题到前后端分离 CMS',
    'halo-theme-to-headless-cms',
    '这篇示例文章展示了新的 Vue3 前端如何通过 Fastify API 读取内容。',
    '<p>欢迎使用 Cool CMS。前端现在通过 REST API 读取文章、分类、标签和站点配置，后端使用 PostgreSQL 持久化数据。</p><p>你可以在内容工作台里创建草稿、发布文章，并继续补充鉴权、上传、评论等能力。</p>',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    'published',
    admin.id,
    category.id,
    now() - interval '2 days',
    128,
    16
  FROM admin, category
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO post_tags (post_id, tag_id)
SELECT inserted.id, tags.id
FROM inserted
JOIN tags ON tags.slug IN ('vue3', 'fastify', 'postgresql')
ON CONFLICT DO NOTHING;
`;

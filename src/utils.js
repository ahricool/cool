export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePage(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

export function cleanPostPayload(body = {}) {
  const title = String(body.title || "").trim();
  const slug = slugify(body.slug || title);
  return {
    title,
    slug,
    excerpt: String(body.excerpt || "").trim(),
    content: String(body.content || ""),
    coverUrl: body.coverUrl || body.cover_url || null,
    status: body.status || "draft",
    categoryId: body.categoryId || body.category_id || null,
    tagIds: Array.isArray(body.tagIds) ? body.tagIds : [],
  };
}

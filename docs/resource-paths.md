# Generated resource paths

The backend assigns an immutable, cryptographically random eight-character slug containing upper-case letters, lower-case letters and digits. Unique database constraints and bounded collision retries protect creation. Both translations of a resource share the same slug. Requests cannot supply or change it.

The scope is exactly `posts.slug`, `pages.slug`, `tags.slug` and historical `categories.slug`. Category application routes and editing are removed, but its tables, translations and article relations are retained. Database UUIDs, authentication/session identifiers, media UUID filenames, image references, fonts, static assets and fixed API/Admin routes are unchanged. `/about` is a fixed alias to a bound Page ID; the underlying Page also receives a generated slug.

## Deployment migration

The built backend's `npm run db:deploy` first applies SQL schema migrations and then runs `dist/migrations/resource-paths.js`. Run a normal manual database/media backup before an eventual deployment. The frontend remains a static Nuxt build; no CI test workflow is introduced.

The resource migration is one transaction. It takes an advisory lock and locks the four resource tables, rewritten translation tables, updates and settings against concurrent writes and row-locking editors. It allocates collision-free replacements, records the old/new mapping, rewrites identifiable root-relative Markdown link destinations in article/page/update translations, and rewrites URL/href/path/link fields in site/homepage JSON. It preserves UUIDs, relationships, other translation fields, publication states/dates and existing `updatedAt` values. Code examples, external links and media URLs are left verbatim. Absolute same-site URLs, arbitrary plain text and external bookmarks require manual review; they are not blindly replaced. Removed category links receive their audited new path but have no public destination because the category module is retired.

A completed `random-resource-paths-v1` batch is skipped on later runs. A rolled-back batch blocks automatic reapplication. SQL creates audit tables only; no historical content/category table is dropped or cleared. Old URLs deliberately have no compatibility redirects.

Inspect or export evidence through the existing database administration workflow:

```sql
SELECT kind, resource_id, old_slug, new_slug
FROM resource_path_changes
WHERE batch_id = 'random-resource-paths-v1'
ORDER BY kind, resource_id;

SELECT record_key, target, before_value, after_value
FROM resource_reference_changes
WHERE batch_id = 'random-resource-paths-v1'
ORDER BY record_key;
```

The reference audit contains authored text; keep exports with private backups. It is not exposed in a public API.

## Rollback

Stop application writers and run `npm run db:paths:rollback -w @cool/backend` in the same built backend environment. Rollback checks that each resource still has its allocated slug and its old slug is free. A conflict aborts the whole transaction. It restores audited paths and unchanged reference values, retains all audit rows, and reports the number of references skipped because they were edited or deleted later. Review any skipped references before restoring the previous application image. Newly created resources are retained and are not part of the historical mapping. A regular backup restore remains available for a full deployment rollback.

This PR validates migration, repeat execution and rollback only in disposable local PostgreSQL schemas/databases. It does not execute the migration on production.

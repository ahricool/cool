# Sakura upstream source reference

Source: https://github.com/LIlGG/halo-theme-sakura
Commit: a31ff6520b34e45beab20ef91204f958dcf1cd81
Retrieved: 2026-10-02
License: MIT (see LICENSE; original notice retained)

- `templates/` and `css/` preserve the source used to map DOM/class names into Vue.
- `apps/blog/public/sakura/main.css` is the upstream compiled main-2.5.0.min.css, unchanged.
- `apps/blog/public/sakura/images/` preserves bundled upstream assets, including image attribution/watermarks. Remote resource URLs and random-image providers are not copied or requested.
- App adapters are separate in `apps/blog/app/assets/adapters.css`.
- Halo directives and Pjax are replaced by Nuxt data loading and routing. Interactive state and event listeners belong to Vue component lifecycles.
- Optional upstream music/video/Live2D/third-party Halo plugin scripts are not loaded.

Template mappings: `layout.html` → default.vue, `module/home/*` → SakuraHero.vue, `macro/content-thumb.html` → PostList.vue, `macro/page-header.html` → PageHeader.vue, `macro/content-post.html` → posts/[slug].vue. Archives, taxonomy, moments, photos and links keep their corresponding template class hierarchy.

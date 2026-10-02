# Third-party visual assets

- **Halo Sakura**: https://github.com/LIlGG/halo-theme-sakura, commit a31ff6520b34e45beab20ef91204f958dcf1cd81, MIT. Original templates, compiled CSS and bundled images are retained locally. Upstream copyright notice is in Sakura-LICENSE.txt and vendor/sakura/LICENSE. Blog footer credits LIlGG.
- **Solar icons** by **480 Design**: https://www.figma.com/community/file/1166831539721848736. Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Selected unchanged SVG paths from https://github.com/iconify/icon-sets/blob/master/json/solar.json are bundled in apps/blog/app/assets/icons.json. Only a local key spelling is adapted; no remote icon API is used.
- **Ubuntu font**: bundled through @fontsource/ubuntu, Ubuntu Font Licence 1.0. Full notice in Ubuntu-Font-LICENSE.txt. Font files are emitted into each app build.
- **Element Plus icons**: @element-plus/icons-vue, MIT, bundled through npm; used only in Admin.
- **highlight.js**: BSD-3-Clause; **markdown-it**: MIT. Package copyright notices are retained by dependency distributions.

No external CDN is required at runtime. User-supplied content images must use the local media API or bundled theme assets; external links remain ordinary hyperlinks.

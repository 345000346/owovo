# owovo MemE fork

This directory is a site-specific fork of the Hugo theme MemE for `owovo`.
It is not intended to remain compatible with the upstream MemE configuration matrix.

Runtime expectations are documented in the repository root:

- `AGENT.md`
- `REFACTOR_PLAN.md`
- `config/_default/`

## Kept Capabilities

- Hugo article list homepage
- Archives, categories, tags and RSS
- Pagefind search
- Dark mode
- SEO metadata, Open Graph, Twitter Cards and JSON-LD
- Code highlighting and copy button
- TOC, heading anchors and article navigation
- Markdown render hooks for links, images, headings and tables
- Optional lightweight integrations such as KaTeX and Mermaid

## Removed Upstream Compatibility

- Lunr and Algolia search
- Multiple comment providers
- PWA service worker
- Adsense and legacy analytics snippets
- Post share widgets and Fediverse share page
- Multilingual theme switcher and non-`zh-cn` language packs
- Poetry, footage and page homepage modes
- Drop cap, paragraph indent, video host and footnote icon HTML post-processing
- Image host and headAlso URL rewriting
- 404 poster and video background parameters
- GitInfo, edit link and feedback widgets
- Post updated SVG badge
- Minimal footer and about minimal footer
- Related posts component
- Force HTTPS client-side redirect script
- InstantPage site-wide preload script
- MathJax rendering pipeline
- Medium Zoom image lightbox integration
- Upstream example configurations

Future features should be rebuilt for this site instead of restoring the old upstream compatibility matrix.

# Changelog

This theme is now maintained as the site-specific `owovo` theme.

The upstream MemE changelog is no longer representative of this fork because many upstream compatibility features have been intentionally removed. Use the repository Git history and the root `REFACTOR_PLAN.md` for current change tracking.

## Current Refactor Baseline

- Restored Hugo and Pagefind build stability.
- Absorbed the theme into the main repository as `themes/owovo`; it is no longer maintained as a Git submodule.
- Replaced fragile Markdown HTML post-processing with Hugo render hooks for links, images, headings and tables.
- Standardized search on Pagefind.
- Removed upstream compatibility layers that are not part of this site strategy.
- Fixed the homepage to the article-list layout.
- Updated theme metadata and README files to describe this fork instead of upstream MemE.
- Removed the InstantPage preload integration.
- Removed MathJax and kept KaTeX as the math rendering path.
- Removed image host URL rewriting from Markdown images and SEO image metadata.
- Simplified the 404 page and removed poster/video background parameters.
- Removed GitInfo, edit link and feedback widgets.
- Removed the post updated SVG badge component.
- Removed minimal footer variants.
- Removed the related posts component.
- Removed the Force HTTPS client-side redirect script.
- Removed the Medium Zoom image lightbox integration.

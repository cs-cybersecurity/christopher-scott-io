# Markdown blog posts

This README is documentation and is excluded from the blog build.

Start the local paste/import tool with `npm run blog:editor` and open the localhost editor URL printed by the server, or create a `.md` file here with:

```text
---
title: "Your article title"
date: 2026-10-22
slug: your-article-title
description: "A brief summary for the listing and RSS reader."
---

Your Markdown content goes here.
```

`title` and `date` are recommended. The slug defaults to the filename without its date prefix. Description is optional. Add `draft: true` to omit a work in progress from both the site and RSS feed. Supported metadata is this simple field format, not arbitrary YAML.

Run `npm run blog:build` after adding or changing a file, then refresh the website. `npm start` and `npm run blog:editor` also build posts before starting the preview. Copying files into this folder does not publish a live site. See [BLOG_EDITOR.md](../BLOG_EDITOR.md) for the manual development-to-production workflow.

To import a Markdown file from elsewhere:

```text
npm run blog:import -- "C:/path/to/article.md" --date 2025-06-30 --title "Article title"
```

For a file that already has metadata, omit the title/date flags. Existing posts are not overwritten by the importer.

Markdown supports headings, lists, links, blockquotes, tables, fenced code blocks, and images. Place website images in `assets/blog/` and reference them as `![Description](assets/blog/example.png)`. HTML is sanitized, and code is displayed as text rather than executed.

The June 30, 2025 article includes all four supplied screenshots in `assets/blog/`. Its original prose is retained; the Obsidian embed references have been replaced with standard Markdown image links and descriptive alt text.

`npm run blog:build` generates `blog-data.js` and `rss.xml`. The feed uses the configurable `SITE.url` in `config.js`, defaulting to this repository's GitHub Pages project path, not the original consulting website. `npm run build` prepares the public static files in `dist/` without editor internals, source notes, scripts, or dependencies. No command commits, pushes, merges, or deploys changes. Keep the RSS URL stable when hosting is configured.

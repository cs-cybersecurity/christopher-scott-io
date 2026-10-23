# Markdown blog posts

This README is documentation and is excluded from the blog build.

Use the local paste/import tool at http://localhost:3000/blog-editor.html, or create a `.md` file here with:

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

Run `npm run blog:build` after adding or changing a file, then refresh the website. `npm start` also builds posts before starting the preview. Copying files into this folder does not publish a live site; deploy the generated assets with the website.

To import a Markdown file from elsewhere:

```text
npm run blog:import -- "C:/path/to/article.md" --date 2025-06-30 --title "Article title"
```

For a file that already has metadata, omit the title/date flags. Existing posts are not overwritten by the importer.

Markdown supports headings, lists, links, blockquotes, tables, fenced code blocks, and images. Place website images in `assets/blog/` and reference them as `![Description](assets/blog/example.png)`. HTML is sanitized, and code is displayed as text rather than executed.

The June 30, 2025 article includes all four supplied screenshots in `assets/blog/`. Its original prose is retained; the Obsidian embed references have been replaced with standard Markdown image links and descriptive alt text.

Deploy `blog-data.js`, `blog.css`, and `rss.xml` alongside the existing website files. The feed URL is https://christopher-scott.net/rss.xml. Keep the RSS URL stable: subscriptions see new entries when the rebuilt feed is deployed. `blog-editor.html`, `blog-editor.js`, source notes, scripts and node_modules are local authoring tools and are not required for public hosting.

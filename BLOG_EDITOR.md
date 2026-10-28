# Local Blog Editor

This is the original Markdown import/download editor, copied into this project. It has no Git, upload, file-write API, or deployment function. The source website is not needed to operate it.

## Setup and launch

For the same file-based editor as the original website, open `blog-editor.html` directly from this project's root in your browser. Its companion `blog-editor.js` loads locally; importing, editing and downloading Markdown require no server.

Use Node.js 22.14 or newer. From the VS Code PowerShell terminal:

```powershell
Set-Location 'C:\Users\Chris\Documents\Workspace\christopher-io'
npm ci
npm run blog:editor
```

For server-based use, open <http://127.0.0.1:3000/blog-editor.html>. The same server previews the site at <http://127.0.0.1:3000/#blog>. Stop it with Ctrl+C. The local server serves the editor files only when launched with the editor command. It binds to `127.0.0.1` and has no write endpoints.

Only two build-time packages are used: `marked` and `sanitize-html`, matching the original implementation. Visitors do not load either package. The public Blog uses prebuilt `blog-data.js` and works without this server.

## Create or edit a post

Enter a title, publication date, optional description, and Markdown body. For an existing post, choose its `.md` file from this project's `posts/` directory with **Import a Markdown file**. Existing title, date, description, slug and draft status are retained.

Click **Save Markdown file** to download the file. The editor does not automatically write it into the repository. Save or move the download into this project's `posts/` directory. When editing, replace the original file; the editor preserves its imported filename so a title-derived filename does not create a duplicate slug.

The supported front matter is a simple field format, not full YAML:

```markdown
---
title: "Your article title"
date: YYYY-MM-DD
slug: your-article-title
description: "A brief article summary."
draft: true
---

Your Markdown content.
```

Use a real publication date in place of `YYYY-MM-DD`. `slug`, `description`, and `draft` are optional; the slug otherwise comes from the filename. The original editor has no categories, tags, image uploader, draft checkbox, or in-form live preview. Add `draft: true` in the Markdown file to keep it out of both the Blog and RSS; importing and saving that file preserves the flag. To preview a draft through the local Blog, temporarily remove the flag, build, and review; restore it and rebuild before preparing the final changes.

## Preview and generate

After saving a file in `posts/`, use another terminal:

```powershell
npm run blog:build
```

Refresh the Blog and open the article. URLs retain the original static hash format: `#blog` and `#blog/article-slug`. `npm start` also builds posts and starts the public preview, but does not enable the editor. The editor and preview commands share port 3000, so run only one server at a time.

The compiler validates dates and slugs, rejects duplicate published slugs, sanitizes HTML, and treats fenced code as text. It never executes shell commands from articles. Files it generates are:

- `blog-data.js`: published article HTML and metadata, newest first.
- `rss.xml`: full-content RSS with absolute article and image URLs.

The existing CLI importer is also available:

```powershell
npm run blog:import -- 'C:\path\to\article.md' --date YYYY-MM-DD --title 'Article title'
```

Use an actual path and date. For a file already containing metadata, omit the title/date flags. The importer copies a new published post into `posts/`, rebuilds the Blog/RSS, and refuses to overwrite an existing slug. For a draft, place the file in `posts/` directly instead.

## Images

Copy images into `assets/blog/`, then reference them relative to the website root document:

```markdown
![Descriptive alternative text](assets/blog/example.png)
```

Do not use local disk paths or `/assets/...` URLs that drop the GitHub Pages project path. The editor does not copy or upload image files. The original article's four images are included.

## Prepare a public build

```powershell
npm run check
npm run test:blog
npm run build
npm run preview:public
```

The build recreates only this checkout's `dist/` directory. It includes the public website, public assets, generated posts and RSS. `blog-editor.html`, `blog-editor.js`, source posts/drafts, scripts, dependencies, documentation, and QA artifacts are excluded. `preview:public` serves that output without editor routes. Stop any existing preview before running it.

Use `dist/` as the GitHub Pages deployment artifact when hosting is configured. Do not publish the entire development checkout or copy editor files into a public directory. No Pages workflow, DNS, custom domain, or deployment is configured by these commands.

## Publish manually through dev and main

Review the Markdown, images and generated Blog/RSS locally. Confirm that your branch is `dev` and the remote is this portfolio repository. For an article change, stage the relevant files, commit, and push manually:

```powershell
git branch --show-current
git remote -v
git add posts assets/blog blog-data.js rss.xml
git commit -m 'Update blog article'
git push origin dev
```

Create and review a GitHub pull request from `dev` into `main`. Merge it yourself. When Pages deployment is configured, its production workflow should build and publish `dist/`. The editor and build scripts never change branches, commit, push, merge, or deploy.

## RSS, metadata and domains

`SITE.url` in `config.js` configures Blog/article metadata and RSS, currently using `https://cs-cybersecurity.github.io/christopher-scott-io/`. This is the repository's Pages project path, not a claim that hosting is enabled. When a custom domain is actually configured, update this value and rebuild the Blog and public output. Keep the trailing slash. The original consulting domain is not used. No sitemap generator existed in the source, so none is introduced.

## Troubleshooting

- **Missing package/module:** run `npm ci` from this project's root using the required Node version.
- **Port 3000 in use:** stop the other preview/editor with Ctrl+C first.
- **Article missing:** check `draft: true`, save location, metadata and build output; rerun `npm run blog:build` and refresh.
- **Duplicate slug:** replace the original edited file instead of retaining two copies. Give different articles unique slugs.
- **Broken image:** use `assets/blog/...`, preserve filename case, and copy the actual file into this repository.
- **Invalid metadata/date:** use only the supported fields and a valid `YYYY-MM-DD` date; do not indent fields or use nested YAML.
- **Editor 404:** use `npm run blog:editor`. Public previews intentionally do not serve administrative tools.
- **Old RSS URLs:** check `SITE.url`, rebuild, and include the regenerated `rss.xml` in your manual review.

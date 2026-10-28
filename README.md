# Christopher Scott | Cybersecurity & IT Professional

Professional portfolio and resume for Christopher Scott, emphasizing enterprise infrastructure, security operations, detection engineering, malware analysis, and threat intelligence.

This checkout is the separate `cs-cybersecurity/christopher-scott-io` project. Changes here do not change the original website or its repository. No hosting, DNS, or deployment configuration is provisioned by this project.

## Local preview

Use Node.js 22.14 or newer. Install the original Blog's build-time dependencies once with `npm ci`.

```text
npm start
```

Open <http://127.0.0.1:3000>. Stop the preview with Ctrl+C.

The lightweight static site uses Home, Resume, Blog, and Contact hash routes. Articles use `#blog/article-slug`. These support direct links and browser history on GitHub Pages without server rewrites. The Home page is readable without JavaScript; the other views require JavaScript. `npm start` rebuilds published articles before starting the preview.

## Files and content

- `index.html`: shared header/footer and complete homepage, including professional background, competencies, and verified credentials.
- `styles.css`: existing navy, burgundy, ivory, soft white, and gold identity; responsive layouts and resume print styles.
- `app.js`: public routing, accessible mobile navigation, credential presentation, resume rendering, print action, contact validation, Blog/articles, and per-page metadata.
- `content.js`: existing resume source data. Employment wording, employer-issued titles, dates, education, and credential details are retained. Full-time and contractor Bank of America entries remain distinct.
- `config.js`: verified professional identity, email, GitHub, and existing LinkedIn profile link.
- `assets/`: genuine existing photographs, employer identifiers, certification artwork, and social icons. See `assets/certifications/sources.json` for credential image provenance. The EC-Council image is an issuer logo, not a fabricated CEH badge.
- `server.js`: localhost preview; local editor routes require `npm run blog:editor`. Public export preview uses `npm run preview:public`.

The obsolete commercial content catalog and standalone email-signature preview remain removed. The original Markdown Blog and download-based local editor have been restored independently. See [BLOG_EDITOR.md](BLOG_EDITOR.md) for setup, authoring, drafts, images, preview and manual publication. Unused personal photo assets may remain in the repository, but only the selected professional photographs are displayed.

The [public GitHub profile](https://github.com/cs-cybersecurity) and its profile README were reviewed for eligible project documentation. No dedicated public project documentation was available to substantiate the requested security project examples, so project entries are omitted. The GitHub profile link remains available for exploring public work.

## Contact form

Contact supports professional correspondence through Name, Email, and Message fields, with a hidden `website` honeypot. The existing Google Apps Script endpoint is retained. Its POST parameters remain `email`, `message`, and `website`; the sender's name is included in the message so the existing backend does not need a schema change. The complete submitted message is limited to 5,000 characters.

Submission retains the original `no-cors` request, timeout, duplicate prevention, validation, and accessible status feedback. An opaque response cannot establish delivery, so the form states that delivery could not be confirmed and offers direct email. Browser checks mock requests and block the Google endpoints as an additional safeguard; they never send live correspondence. Live endpoint behavior and email delivery are not verified by those checks.

The publicly displayed contact address and email links use `christopher.scott.biz@gmail.com`. The existing Google Apps Script integration and backend delivery routing remain unchanged.

## Verification

```text
npm run check
npm run test:blog
npm run check:browser
```

The source check compares the entire resume data against `git show HEAD:content.js`, verifies the four navigation items, checks local asset references, and checks removal of commercial routes and custom-domain configuration. Blog tests cover Markdown, sanitization, drafts, duplicate slugs, anchors and RSS. This baseline protects the current task's resume fidelity; intentional future resume edits will need a corresponding baseline review.

The browser check uses installed Chrome or Edge through its native DevTools protocol, with no browser package downloads. Close any local preview on port 3000 before running it; the check starts and stops its own preview and headless browser. It verifies all public routes and the original article at 1920 × 1080, 1440 × 900, 1366 × 768, 768 × 1024, and 390 × 844. It also imports/downloads an existing article, creates and previews a temporary post, checks draft round trips, then removes the test posts and regenerates clean Blog/RSS files. Resume content, print/PDF, and mocked contact behavior remain covered. Screenshots and the resume PDF are written to ignored `qa-artifacts/`.

## Static hosting compatibility

Run `npm run build` to generate the public `dist/` artifact. The allowlisted export includes the existing portfolio, Blog, generated posts, RSS and public assets, while excluding editor internals, source posts/drafts, scripts, dependencies and local files. No framework, runtime dependencies, remote CMS or server backend is added. Configure future Pages deployment to publish `dist/` rather than the development checkout.

No custom website domain is assumed. `SITE.url` supplies the repository's GitHub Pages project URL for Blog-only metadata and RSS; non-blog SEO metadata remains unchanged. There is no `CNAME` or copied original-site URL metadata. GitHub Pages has not been enabled or deployed. All work remains local for manual review; no automatic commit, push, or merge is part of the workflow.

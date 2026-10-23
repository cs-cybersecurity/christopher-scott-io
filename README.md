# Christopher Scott — Technology Consulting

Personal consulting website for **IT Consulting, Cybersecurity & Web Development**, at the intended production domain **https://christopher-scott.net/**.

## Run locally

Run `npm start` from this directory and visit http://localhost:3000. Stop with Ctrl+C. No dependency installation or build step is needed. `index.html` also opens directly in a browser for the default configuration.

Run `npm run check` for JavaScript syntax and source fidelity checks.

Run `npm run check:browser` for real desktop/mobile browser checks when Chrome or Edge is installed. This uses the native DevTools protocol, requires no packages, and writes screenshots and a resume PDF to `qa-artifacts/`. Close any existing local preview on port 3000 before running it. The check owns and stops its preview server and headless browser.

## Structure

- `index.html`: global navigation, metadata, and the complete homepage. The homepage remains readable without JavaScript.
- `styles.css`: responsive light editorial design and resume print styles. System fonts; no external font requests.
- `app.js`: Home, Services, Resume, Blog, and Contact views; accessible mobile navigation; service-section links; print action; per-view metadata.
- `config.js`: verified public LinkedIn URL and domain; the authorized contact email and optional genuine photograph.
- `content.js`: faithful service catalog and LinkedIn transcription. Authoritative text is kept separate from marketing copy.
- `Services.txt` and `LinkedInInforamtion.txt`: unchanged authoritative source files.
- `scripts/validate-content.js`: independently compares the data against the source files.
- `server.js`: existing dependency-free local preview server, with image MIME types added for an optional real photograph.

The existing static hash routing is retained. Individual detail URLs extend a category with the service slug, e.g. `/#services/web-development/website-development`; contact context uses `/#contact/web-development/website-development`. Main routes: `/#home`, `/#services`, `/#resume`, `/#blog`, `/#contact`. Direct category links use `/#services/compliance-audit`, `/#services/cloud-devops`, `/#services/microsoft-security`, `/#services/cloud-migration`, `/#services/ongoing-advisory`, and `/#services/web-development`. These links work on static hosting without rewrite configuration, and support browser back/forward navigation. The canonical URL remains https://christopher-scott.net/.

## Content integrity

The catalog contains **48 original services in five original categories**. Original names and archived descriptions remain verbatim in `content.js`. Public service copy is now complete, newly authored consulting copy in `service-details.js`, as authorized in the premium revision. The directory has 52 offerings: the 48 originals plus four explicitly identified web development offerings. Every offering has a dedicated hash route, overview, three deliverables, and consultation action. No truncated source excerpts are displayed.

The resume contains **11 roles across 8 employer groups, 2 education entries, and 7 certifications**. Wording, source order, dates, durations, credential links, and the extra standalone `Present` line are preserved as provided. LinkedIn interface artifacts (logo labels, duplicate section labels, blank lines, and credential-button text) are not professional content; credential URLs are rendered as working “Show credential” links. No dates or durations are recalculated.

Homepage summaries are separately authored from the user's brief and verified source facts. The resume itself has only Experience, Education, and Licenses & Certifications. Blog now renders local Markdown posts with RSS subscriptions; see `posts/README.md` for publishing instructions. Contact has only the authorized email destination, a message field, and Send Message. This requests a draft in the visitor’s email application; it never claims delivery. Service context is carried in the URL and email subject. No backend credentials or paid provider are needed.

## Configuration and validation

The destination is configured as `christopher.scott.biz@gmail.com`. Visitors need an email app or protocol handler to send their draft. There is no server-side delivery service. No LinkedIn source data is missing.

`service-details.js` is the public catalog; `content.js` retains the original source transcription for auditing. `npm run check` validates both source integrity and unique complete service routes. `npm run check:browser` tests all detail views, responsive layouts, keyboard navigation, history, and actual mailto navigation with recipient, subject and multiline body encoding.

Bank of America, Front Range Community College, Transwest, and Lumen logos use the replacement sources supplied by Christopher, recorded in `scripts/download-logos.py`. Trustwave and Denver retain their existing official-site icons. Logos are employer identifiers on the resume, not client endorsements. Separate employment periods remain separate. Timeline layout does not rewrite career text.

Optional genuine photograph configuration remains available. No photograph is included.

## Service writing references

New copy distinguishes technical implementation and readiness assistance from independent assessment, legal advice, and certification. References consulted include [ISO/IEC 27001](https://committee.iso.org/cms/live/live/en/sites/isoorg/contents/news/insights/information%20security/identity-management/newsBody/content-list/standard-reference%40/82875.html), [NIST SP 800-171 assessment guidance](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171Ar3/NIST.SP.800-171Ar3.html), and [Microsoft Defender for Cloud Apps setup](https://learn.microsoft.com/en-us/defender-cloud-apps/general-setup). Framework applicability and product licensing are scoped for each engagement; the copy does not promise certification or approval.

## Deployment

No hosting manifest, environment file, or deployment infrastructure was present in the workspace. The existing static serving and `npm start` workflow are preserved; nothing has been deployed and no DNS changes have been made.

For static hosting, deploy `index.html`, `styles.css`, `app.js`, `config.js`, `content.js`, `service-details.js`, and `assets/`, plus a real photo if configured. Keep source documents, validation scripts and local QA artifacts out of the public upload. No framework, build tooling, analytics, or third-party JavaScript is required.


## Markdown blog (local publishing)

Run `npm install` once to install the build-only Markdown parser and HTML sanitizer. Visitors load prebuilt HTML data, not those packages. Use http://localhost:3000/blog-editor.html to paste Markdown or import a `.md` file. Save into `posts/`, then run `npm run blog:build` and refresh. `npm start` rebuilds posts first. See [posts/README.md](posts/README.md) for the front matter format, command-line importer, drafts and images.

RSS is available at https://christopher-scott.net/rss.xml and includes full articles. Deploy the updated `blog-data.js`, `blog.css`, and `rss.xml` alongside the existing site files after every post change. There is no hosted CMS or upload backend. The local helper downloads a Markdown file; it does not publish it.

The initial post is **Self-Host Next.js with Docker and Nginx**, dated **June 30, 2025**. The original article prose is preserved in `posts/`. Its image references now include all four supplied screenshots, stored locally in `assets/blog/`. Nested Markdown links are normalized during rendering. Article commands are content and were never executed.

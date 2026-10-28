import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {marked} from 'marked';
import sanitizeHtml from 'sanitize-html';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const xml = text => String(text).replace(/[<>&"']/g, char => ({'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;'}[char]));
const safe = text => xml(text);

export function normalizeSiteURL(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw Error('SITE.url must be an absolute HTTP(S) website URL without credentials, query, or fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

export function readSiteURL(rootDirectory = root) {
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(rootDirectory, 'config.js'), 'utf8'), context, {timeout: 1000});
  return normalizeSiteURL(context.window.SITE?.url);
}

export function parsePost(source, filename, {siteURL = readSiteURL()} = {}) {
  const site = normalizeSiteURL(siteURL);
  let body = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const metadata = {};
  if (body.startsWith('---\n')) {
    const end = body.indexOf('\n---\n', 4);
    if (end < 0) throw Error(`${filename}: unclosed front matter`);
    for (const line of body.slice(4, end).split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const match = line.match(/^(title|date|description|slug|draft):\s*(.*)$/);
      if (!match) throw Error(`${filename}: unsupported metadata line: ${line}`);
      let value = match[2].trim();
      if (value.startsWith('"')) value = JSON.parse(value);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/''/g, "'");
      metadata[match[1]] = value;
    }
    body = body.slice(end + 5);
  }
  if (String(metadata.draft).toLowerCase() === 'true') return null;
  const date = metadata.date || filename.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw Error(`${filename}: valid date: YYYY-MM-DD required`);
  const slug = metadata.slug || filename.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error(`${filename}: invalid slug`);
  const firstHeading = body.match(/^# (.+)\n/);
  const title = metadata.title || firstHeading?.[1] || slug.replace(/-/g, ' ');
  if (firstHeading && (!metadata.title || metadata.title === firstHeading[1])) body = body.slice(firstHeading[0].length);
  const description = metadata.description || body.split(/\n\s*\n/).map(p => p.trim()).find(p => p && !/^[#`!<]/.test(p))?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').slice(0, 220) || title;
  // Repair nested-link syntax from the supplied Obsidian note only at render time.
  body = body.replace(/\[([^\]]+)\]\(\[[^\]]+\]\((https?:\/\/[^\s)]+)\)\)/g, '[$1]($2)');
  body = body.replace(/!\[\[([^\]]+)\]\]/g, (_, name) => `<p class="blog-missing-image">Screenshot not included in the supplied files: ${safe(name)}</p>`);
  let html = marked.parse(body, {gfm: true, breaks: false});
  const headings = new Map();
  const headingIDs = new Set();
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, level, text) => {
    const base = text.replace(/<[^>]*>/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    const count = (headings.get(base) || 0) + 1; headings.set(base, count);
    const id = `post-${base}${count > 1 ? `-${count}` : ''}`;
    headingIDs.add(id);
    const adjusted = Math.min(Number(level) + 1, 6);
    return `<h${adjusted} id="${id}">${text}</h${adjusted}>`;
  });
  html = sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {'*':['id'], a:['href','title','rel'], img:['src','alt','title','width','height','loading'], code:['class'], p:['class']},
    allowedSchemes:['http','https','mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attributes) => ({tagName:tag, attribs:{...attributes,rel:'noopener noreferrer'}}),
      img: (tag, attributes) => ({tagName:tag, attribs:{...attributes,loading:'lazy'}})
    }
  });
  // Keep article anchors inside the existing hash router instead of leaving the post.
  html = html.replace(/\bhref="#([^"]*)"/g, (match, fragment) => {
    if (/^(?:home|resume|blog|contact)(?:\/|$)/.test(fragment)) return match;
    const target = headingIDs.has(fragment) ? fragment : headingIDs.has(`post-${fragment}`) ? `post-${fragment}` : fragment;
    return `href="#blog/${slug}/${target}"`;
  });
  // RSS readers need absolute asset/link URLs rather than local document paths.
  const rssHTML = html.replace(/\b(href|src)="([^"]+)"/g, (match, attr, value) => {
    if (/^(https?:|mailto:)/i.test(value)) return match;
    return `${attr}="${safe(new URL(value.replace(/&amp;/g, '&'), site).href)}"`;
  });
  return {slug, title, date, description, html, rssHTML, source: filename};
}

export function buildBlog({rootDirectory = root, siteURL = readSiteURL(rootDirectory)} = {}) {
  const site = normalizeSiteURL(siteURL);
  const outputRoot = path.resolve(rootDirectory);
  const directory = path.join(outputRoot, 'posts');
  fs.mkdirSync(directory, {recursive:true});
  const posts = fs.readdirSync(directory).filter(name => /\.md$/i.test(name) && name.toLowerCase() !== 'readme.md').sort().map(name => parsePost(fs.readFileSync(path.join(directory,name),'utf8'),name, {siteURL: site})).filter(Boolean).sort((a,b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  if (new Set(posts.map(post => post.slug)).size !== posts.length) throw Error('Duplicate blog slug; give each post a unique slug.');
  const json = JSON.stringify(posts.map(({rssHTML,...post})=>post), null, 2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const script = `// Generated from posts/*.md by npm run blog:build.\nwindow.BLOG_POSTS = ${json};\n`;
  const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n<channel><title>Christopher Scott — Blog</title><link>${xml(site)}#blog</link><description>Technical writing by Christopher Scott.</description><language>en-us</language><atom:link href="${xml(new URL('rss.xml', site))}" rel="self" type="application/rss+xml"/>${posts.length ? `<lastBuildDate>${new Date(posts[0].date+'T12:00:00Z').toUTCString()}</lastBuildDate>` : ''}\n${posts.map(post => {
    const link = `${site}#blog/${post.slug}`;
    return `<item><title>${xml(post.title)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><pubDate>${new Date(post.date+'T12:00:00Z').toUTCString()}</pubDate><description>${xml(post.description)}</description><content:encoded>${xml(post.rssHTML)}</content:encoded></item>`;
  }).join('\n')}\n</channel></rss>\n`;
  fs.writeFileSync(path.join(outputRoot,'blog-data.js'),script);
  fs.writeFileSync(path.join(outputRoot,'rss.xml'),feed);
  return posts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${buildBlog().length} blog post(s) and rss.xml.`);
}

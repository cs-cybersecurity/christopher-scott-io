'use strict';

// Verify source fidelity and static-site integrity without dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const data = source => {
  const sandbox = {window: {}};
  vm.runInNewContext(source, sandbox, {timeout: 1000});
  return JSON.parse(JSON.stringify(sandbox.window.CONTENT));
};
const original = data(execFileSync('git', ['show', 'HEAD:content.js'], {cwd: root, encoding: 'utf8'}));
const current = data(read('content.js'));
assert.deepEqual(current.resume, original.resume,
  'Every employment, education, and credential value must match the existing resume');
assert.equal(Object.hasOwn(current, 'services'), false, 'Obsolete catalog data must be removed');
const resume = current.resume;
assert.equal(resume.experience.length, 8, 'All original employer groups retained');
assert.equal(resume.experience.reduce((count, group) => count + group.roles.length, 0), 11);
assert.equal(resume.education.length, 2);
assert.equal(resume.certifications.length, 7);
assert.equal(resume.experience.filter(group => group.employer === 'Bank of America').length, 2,
  'Full-time and contractor Bank of America entries remain separate');

const html = read('index.html');
const runtime = read('app.js');
const config = read('config.js');
const nav = html.match(/<nav\b[^>]*id="primary-navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(nav, 'Primary navigation exists');
assert.deepEqual([...nav.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
  .map(match => [match[1], match[2]]), [['#home', 'Home'], ['#resume', 'Resume'], ['#blog', 'Blog'], ['#contact', 'Contact']]);
assert.match(html, /Christopher Scott \| Cybersecurity &amp; IT Professional/);
assert.match(html, /Engineering secure systems\. Defending complex environments\./);
assert.match(html, /#14263D/i);
assert.doesNotMatch(html, /rel="canonical"|property="og:url"/,
  'Non-blog metadata keeps its existing domain-independent behavior');
assert.match(html, /application\/rss\+xml/);
for (const name of ['index.html', 'app.js', 'config.js', 'content.js', 'styles.css']) {
  const source = read(name);
  assert.doesNotMatch(source, /#services\b|\bCATALOG\b|service-details\.js/i,
    `No obsolete routes or runtime dependencies in ${name}`);
  assert.doesNotMatch(source, /independent technology consultant|book a consultation|request a quote|hire me|freelanc|consulting packages/i,
    `No commercial positioning in ${name}`);
  assert.doesNotMatch(source, /https:\/\/christopher-scott\.net/i,
    `No hardcoded original website links in ${name}; email is preserved separately`);
}
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(?:#|https?:|mailto:|data:)/.test(value)) continue;
  const file = path.resolve(root, value.split(/[?#]/)[0]);
  assert.ok(file.startsWith(root + path.sep), `Asset stays in workspace: ${value}`);
  assert.ok(fs.existsSync(file), `Referenced local file exists: ${value}`);
}
const endpoint = /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/;
assert.equal(runtime.match(endpoint)?.[0], execFileSync('git', ['show', 'HEAD:app.js'], {cwd: root, encoding: 'utf8'}).match(endpoint)?.[0],
  'Existing Apps Script endpoint preserved');
assert.match(config, /https:\/\/www\.linkedin\.com\/in\/cs-cybersecurity/);
assert.match(config, /christopher\.scott\.biz@gmail\.com/);
for (const file of ['CNAME', 'service-details.js']) {
  assert.equal(fs.existsSync(path.join(root, file)), false, `Obsolete file removed: ${file}`);
}
assert.ok(fs.existsSync(path.join(root, 'blog-editor.html')), 'Original-named local editor exists');
assert.ok(fs.existsSync(path.join(root, 'blog-editor.js')), 'Local editor script exists');
const pkg = JSON.parse(read('package.json'));
assert.equal(Object.keys(pkg.dependencies || {}).length, 0, 'Public website has no runtime dependencies');
assert.deepEqual(Object.keys(pkg.devDependencies || {}).sort(), ['marked','sanitize-html']);
console.log('PASS: all 11 roles, 8 employer groups, 2 education entries and 7 certifications match HEAD exactly.');
console.log('PASS: four primary routes, metadata, local asset links, verified contact identity, unchanged form endpoint, and domain cleanup.');

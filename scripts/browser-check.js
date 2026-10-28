'use strict';

// Installed Chrome/Edge + native DevTools; no packages or browser downloads.
// Contact requests are mocked and Google endpoints are blocked independently.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {spawn, execFileSync} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(root, 'qa-artifacts');
const origin = 'http://127.0.0.1:3000';
const debugPort = 9237;
const browserPath = [process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(file => file && fs.existsSync(file));
const errors = [];
const requests = new Map();
const temporaryPosts = [];
let server, browser, socket, sequence = 0;

async function until(action, message, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const result = await action(); if (result) return result; } catch {}
    await delay(75);
  }
  throw Error(`Timeout: ${message}`);
}
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { requests.delete(id); reject(Error(`DevTools timeout: ${method}`)); }, 10000);
    requests.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const articleRoute = 'blog/self-host-nextjs-with-docker-and-nginx';
const headings = {home: 'Engineering secure systems. Defending complex environments.', resume: 'Resume', blog:'Blog', contact: 'Get in Touch', [articleRoute]:'Self-Host Next.js with Docker and Nginx'};
async function route(page, fresh = false) {
  if (fresh) await send('Page.navigate', {url: `${origin}/#${page}`});
  else await evaluate(`location.hash = ${JSON.stringify('#' + page)}`);
  await until(() => evaluate(`document.readyState === 'complete' && location.hash === ${JSON.stringify('#' + page)} && document.querySelector('#main h1')?.textContent.trim() === ${JSON.stringify(headings[page])}`), `route ${page}`);
  await delay(50);
}
async function screenshot(name, full = false) {
  const options = {format: 'png', captureBeyondViewport: full};
  if (full) {
    const metrics = await send('Page.getLayoutMetrics');
    options.clip = {...metrics.cssContentSize, scale: 1};
  }
  const shot = await send('Page.captureScreenshot', options);
  fs.writeFileSync(path.join(artifacts, name), Buffer.from(shot.data, 'base64'));
}
async function checkLayout(page, width, height) {
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false, `${page} at ${width}: horizontal overflow`);
  assert.equal(await evaluate(`document.querySelectorAll('#main h1').length`), 1, 'Exactly one page heading');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('a')).some(a => !a.getAttribute('href'))`), false, 'No empty links');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('#main [aria-labelledby]')).some(e => e.getAttribute('aria-labelledby').split(/\\s+/).some(id => !document.getElementById(id)))`), false, 'Accessible heading references');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('a[href^="#"]')).some(a => !['#home','#resume','#blog','#contact','#main'].includes(a.hash) && !a.hash.startsWith('#blog/'))`), false, 'Only public routes, articles and skip target');
  assert.equal(await evaluate(`document.querySelector('#primary-navigation a[aria-current="page"]').hash`), '#' + page.split('/')[0]);
  await evaluate(`document.querySelectorAll('img').forEach(img => img.loading = 'eager')`);
  await until(() => evaluate(`Array.from(document.querySelectorAll('img')).every(img => img.complete && img.naturalWidth > 0)`), `${page} images at ${width}`);
  if (page === 'home') {
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.home-photo-frame img')).some(img => getComputedStyle(img).objectFit !== 'contain')`), false, 'Photographs preserve their full framing');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('#main img')).some(img => /with-cat/i.test(img.src))`), false, 'Cat photograph is absent from the professional presentation');
    if (width >= 1366) assert.ok(await evaluate(`document.querySelector('.intro-hero').getBoundingClientRect().bottom <= innerHeight + 1`), `Hero fits desktop first viewport at ${width} × ${height}`);
  }
}

async function checkContact() {
  await route('contact');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#message-form label'), label => label.textContent)`), ['Name', 'Email', 'Message']);
  assert.equal(await evaluate(`document.querySelector('#visitor-name').autocomplete`), 'name');
  assert.equal(await evaluate(`document.querySelector('#visitor-name').maxLength`), 120);
  assert.equal(await evaluate(`document.querySelector('#visitor-email').type`), 'email');
  assert.equal(await evaluate(`document.querySelector('#visitor-email').autocomplete`), 'email');
  assert.equal(await evaluate(`document.querySelector('#visitor-email').maxLength`), 254);
  assert.equal(await evaluate(`document.querySelector('[name=website]').hidden`), true);
  assert.equal(await evaluate(`document.querySelector('#email-status').getAttribute('role')`), 'status');
  assert.equal(await evaluate(`document.querySelector('a[href^="mailto:"]').href`), 'mailto:christopher.scott.biz@gmail.com');
  assert.ok(await evaluate(`document.querySelector('.contact-page a[href="https://www.linkedin.com/in/cs-cybersecurity"]') !== null`));
  assert.ok(await evaluate(`document.querySelector('.contact-page a[href="https://github.com/cs-cybersecurity"]') !== null`));
  await evaluate(`document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate('window.__contactRequests.length'), 0, 'Required fields block empty submissions');
  await evaluate(`document.querySelector('#visitor-name').value='Visitor';document.querySelector('#visitor-email').value='invalid';document.querySelector('#message').value='A professional introduction.';document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate('window.__contactRequests.length'), 0, 'Invalid email is blocked');
  await evaluate(`document.querySelector('#visitor-email').value='visitor@example.com';document.querySelector('#message').value='short';document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate('window.__contactRequests.length'), 0, 'Short message is blocked');
  const submitEvent = `document.querySelector('#message-form').dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}))`;
  await evaluate(`document.querySelector('#message').value=' '.repeat(20);${submitEvent}`);
  assert.equal(await evaluate('window.__contactRequests.length'), 0, 'Whitespace-only message is blocked');
  await evaluate(`document.querySelector('#visitor-name').value=' '.repeat(5);document.querySelector('#message').value='A professional introduction.';${submitEvent}`);
  assert.equal(await evaluate('window.__contactRequests.length'), 0, 'Whitespace-only name is blocked');
  await evaluate(`document.querySelector('#visitor-name').value='Visitor';document.querySelector('#message').value='x'.repeat(5001);${submitEvent}`);
  assert.equal(await evaluate('window.__contactRequests.length'), 0, 'Overlong message is blocked');
  await evaluate(`document.querySelector('#message').value='x'.repeat(5000);${submitEvent}`);
  assert.equal(await evaluate('window.__contactRequests.length'), 0, 'Combined name and message length is bounded');
  const message = 'Hello & thank you.\nA professional introduction.';
  await evaluate(`document.querySelector('#visitor-name').value='  Visitor   Example  ';document.querySelector('#visitor-name').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#message').value=${JSON.stringify(message)};document.querySelector('#message').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate('window.__contactRequests.length'), 1);
  assert.equal(await evaluate(`document.querySelector('#message-form button').disabled`), true);
  assert.equal(await evaluate(`document.querySelector('#message-form').getAttribute('aria-busy')`), 'true');
  await evaluate(submitEvent);
  assert.equal(await evaluate('window.__contactRequests.length'), 1, 'Duplicate submission prevented');
  const submission = await evaluate('window.__contactRequests[0]');
  assert.equal(submission.url, 'https://script.google.com/macros/s/AKfycbyApUCyiSJnz4StzEvdMwLX7ib0fnWCidAvpVbR8g6fmHoLlmjUbzgqq3dh4pvzRGR3FQ/exec');
  assert.equal(submission.method, 'POST');
  assert.equal(submission.mode, 'no-cors');
  assert.equal(submission.credentials, 'omit');
  assert.deepEqual(submission.body.map(pair => pair[0]), ['email', 'message', 'website']);
  assert.deepEqual(Object.fromEntries(submission.body), {email:'visitor@example.com', message:`Name: Visitor Example\n\n${message}`, website:''});
  await evaluate('window.__completeContact()');
  await until(() => evaluate(`!document.querySelector('#message-form button').disabled`), 'contact completion');
  assert.ok(await evaluate(`document.querySelector('#email-status').textContent.includes('Delivery could not be confirmed')`), 'Opaque response does not claim delivery');
  assert.equal(await evaluate(`document.querySelector('#message-form').hasAttribute('aria-busy')`), false);
  for (const mode of ['failure', 'http-failure', 'abort']) {
    await evaluate(`window.__contactMode=${JSON.stringify(mode)};document.querySelector('#message-form').requestSubmit()`);
    await until(() => evaluate(`!document.querySelector('#message-form button').disabled && document.querySelector('#email-status').textContent !== 'Submitting your message…'`), mode);
    assert.ok(await evaluate(`document.querySelector('#email-status').textContent.includes(${JSON.stringify(mode === 'abort' ? 'timed out' : 'Unable to submit')})`), `${mode} feedback`);
    assert.equal(await evaluate(`document.querySelector('#message').value`), message, 'Draft retained after failed submission');
  }
  const prior = await evaluate('window.__contactRequests.length');
  await evaluate(`document.querySelector('[name=website]').value='spam.example';document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate('window.__contactRequests.length'), prior, 'Honeypot blocks submission');
  await evaluate(`document.querySelector('[name=website]').value='';window.__contactMode='pending';document.querySelector('#visitor-name').value='Visitor Example';document.querySelector('#message').value='x'.repeat(5000 - ('Name: Visitor Example\\n\\n').length);document.querySelector('#message').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate('window.__contactRequests.length'), prior + 1, 'Combined 5,000-character boundary accepted');
  assert.equal(await evaluate(`Object.fromEntries(window.__contactRequests.at(-1).body).message.length`), 5000);
  await evaluate('window.__completeContact()');
  await until(() => evaluate(`!document.querySelector('#message-form button').disabled`), 'boundary submission completion');
}

async function checkEditor() {
  const downloads = fs.mkdtempSync(path.join(artifacts, 'editor-downloads-'));
  await send('Browser.setDownloadBehavior', {behavior:'allow',downloadPath:downloads});
  const openEditor = async () => {
    await send('Page.navigate', {url:pathToFileURL(path.join(root,'blog-editor.html')).href});
    await until(() => evaluate(`document.readyState === 'complete' && document.querySelector('#post-editor') !== null`), 'local editor');
  };
  const importFile = async file => {
    const doc = await send('DOM.getDocument');
    const input = await send('DOM.querySelector', {nodeId:doc.root.nodeId,selector:'#post-file'});
    await send('DOM.setFileInputFiles', {nodeId:input.nodeId,files:[file]});
    await until(() => evaluate(`document.querySelector('#editor-status').textContent.startsWith('File loaded.')`), 'Markdown import');
  };
  await openEditor();
  const originalName = '2025-06-30-self-host-nextjs-with-docker-and-nginx.md';
  await importFile(path.join(root, 'posts', originalName));
  assert.equal(await evaluate(`document.querySelector('#post-title').value`), 'Self-Host Next.js with Docker and Nginx');
  assert.equal(await evaluate(`document.querySelector('#post-date').value`), '2025-06-30');
  assert.ok(await evaluate(`document.querySelector('#post-body').value.includes('docker build -t my-nextjs-app .')`));
  await evaluate(`document.querySelector('#post-editor').requestSubmit()`);
  await until(() => fs.existsSync(path.join(downloads,originalName)), 'existing article download preserves filename');
  assert.ok(fs.readFileSync(path.join(downloads,originalName),'utf8').includes('slug: self-host-nextjs-with-docker-and-nginx'));

  await openEditor();
  await evaluate(`document.querySelector('#post-title').value='Local editor QA check';document.querySelector('#post-date').value='2026-10-27';document.querySelector('#post-description').value='Temporary local QA article.';document.querySelector('#post-body').value='# Preview heading\\n\\n**Working preview.**\\n\\n![Image](assets/blog/cloudflare-dns-example.png)';document.querySelector('#post-editor').requestSubmit()`);
  const filename = '2026-10-27-local-editor-qa-check.md';
  await until(() => fs.existsSync(path.join(downloads,filename)), 'new Markdown download');
  const destination = path.join(root,'posts',filename);
  assert.equal(fs.existsSync(destination), false, 'Temporary article cannot overwrite an existing post');
  fs.copyFileSync(path.join(downloads,filename),destination,fs.constants.COPYFILE_EXCL);
  temporaryPosts.push(destination);
  execFileSync(process.execPath, ['scripts/build-blog.mjs'], {cwd:root});
  headings['blog/local-editor-qa-check'] = 'Local editor QA check';
  await route('blog/local-editor-qa-check',true);
  assert.equal(await evaluate(`document.querySelector('.markdown-body strong').textContent`), 'Working preview.');
  await evaluate(`document.querySelector('.markdown-body img').loading='eager'`);
  await until(() => evaluate(`document.querySelector('.markdown-body img').naturalWidth > 0`), 'new post image');
  await screenshot('editor-created-post-preview.png');

  const draftFile = path.join(downloads,'2026-10-27-local-editor-qa-draft.md');
  fs.writeFileSync(draftFile,'---\ntitle: QA draft\ndate: 2026-10-27\nslug: local-editor-qa-draft\ndraft: true\n---\n\nPrivate draft text.');
  await openEditor();await importFile(draftFile);
  const draftDownloads = fs.mkdtempSync(path.join(artifacts,'draft-downloads-'));
  await send('Browser.setDownloadBehavior', {behavior:'allow',downloadPath:draftDownloads});
  await evaluate(`document.querySelector('#post-editor').requestSubmit()`);
  const savedDraft = path.join(draftDownloads,path.basename(draftFile));
  await until(() => fs.existsSync(savedDraft), 'draft round-trip download');
  assert.ok(fs.readFileSync(savedDraft,'utf8').includes('draft: true'));
  const draftDestination = path.join(root,'posts',path.basename(draftFile));
  fs.copyFileSync(savedDraft,draftDestination,fs.constants.COPYFILE_EXCL);temporaryPosts.push(draftDestination);
  execFileSync(process.execPath, ['scripts/build-blog.mjs'], {cwd:root});
  await route('blog',true);
  assert.equal(await evaluate(`BLOG_POSTS.some(p=>p.slug === 'local-editor-qa-draft')`), false, 'Draft never published');
  await openEditor();await screenshot('local-blog-editor.png');
}

(async () => {
  assert.ok(browserPath, 'A local Chrome or Edge installation is needed');
  fs.mkdirSync(artifacts, {recursive:true});
  for (const url of [origin, `http://127.0.0.1:${debugPort}/json/version`]) {
    let occupied = false;
    try { await fetch(url); occupied = true; } catch {}
    assert.equal(occupied, false, `Port already in use: ${url}`);
  }
  server = spawn(process.execPath, ['server.js','--editor'], {cwd:root, windowsHide:true, stdio:'ignore'});
  await until(async () => (await fetch(origin)).status === 200, 'local preview');
  const profile = fs.mkdtempSync(path.join(artifacts, 'browser-profile-'));
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-default-apps', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${debugPort}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide:true, stdio:'ignore'});
  const target = await until(async () => (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(page => page.type === 'page'), 'browser DevTools');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message', event => {
    const data = JSON.parse(String(event.data));
    if (data.id && requests.has(data.id)) {
      const request = requests.get(data.id);requests.delete(data.id);clearTimeout(request.timer);
      if (data.error) request.reject(Error(JSON.stringify(data.error))); else request.resolve(data.result);
    }
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
    if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') errors.push(data.params.entry);
    if (data.method === 'Network.responseReceived' && data.params.response.status >= 400) errors.push(data.params.response);
  });
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
  await send('Network.setBlockedURLs', {urls:['*://script.google.com/*','*://script.googleusercontent.com/*']});
  await send('Page.addScriptToEvaluateOnNewDocument', {source:`
    window.__contactRequests=[];
    window.__contactMode='pending';
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,options)=>{
      if(String(input).startsWith('https://script.google.com/')){
        window.__contactRequests.push({url:String(input),method:options.method,mode:options.mode,credentials:options.credentials,body:Array.from(options.body.entries())});
        if(window.__contactMode==='failure') return Promise.reject(new TypeError('Simulated offline connection'));
        if(window.__contactMode==='http-failure') return Promise.resolve({type:'basic',ok:false,status:500});
        if(window.__contactMode==='abort') return Promise.reject(new DOMException('Simulated timeout','AbortError'));
        return new Promise(resolve=>window.__completeContact=()=>resolve({type:'opaque',ok:false,status:0}));
      }
      return nativeFetch(input,options);
    };
  `});
  for (const [width,height] of [[1920,1080],[1440,900],[1366,768],[768,1024],[390,844]]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false});
    for (const page of ['home','resume','blog',articleRoute,'contact']) {
      await route(page, true);
      await checkLayout(page,width,height);
      await screenshot(`${page.replaceAll('/','-')}-${width}x${height}.png`);
      if (page === 'home' && [1440,390].includes(width)) await screenshot(`home-${width}-full.png`, true);
    }
  }
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await route('home');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#primary-navigation a'),a=>a.textContent)`), ['Home','Resume','Blog','Contact']);
  assert.equal(await evaluate(`document.querySelector('#home-certification-list strong').textContent`), 'Certified Ethical Hacker (CEH)');
  assert.equal(await evaluate(`document.querySelectorAll('.home-credential').length`), 7);
  assert.equal(await evaluate(`document.querySelector('.hero-social a[aria-label="GitHub"]').href`), 'https://github.com/cs-cybersecurity');
  assert.equal(await evaluate(`document.querySelector('.hero-social a[aria-label="LinkedIn"]').href`), 'https://www.linkedin.com/in/cs-cybersecurity');
  await evaluate(`document.querySelector('.intro-hero a[href="#resume"]').click()`);
  await until(() => evaluate(`document.querySelector('#print-resume') !== null`), 'View Resume action');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.resume-section > h2'),h=>h.textContent)`), ['Experience','Education','Licenses & Certifications']);
  assert.equal(await evaluate(`document.querySelectorAll('.resume-role').length`), 11);
  assert.equal(await evaluate(`document.querySelectorAll('.education-entry').length`), 2);
  assert.equal(await evaluate(`document.querySelectorAll('.certification-entry').length`), 7);
  assert.equal(await evaluate(`CONTENT.resume.experience.every((group,i)=>{const e=document.querySelectorAll('.experience-group')[i];return e.querySelector('h3').textContent===group.employer && JSON.stringify(Array.from(e.querySelector('.employer-header').querySelectorAll('.entry-meta'),p=>p.textContent))===JSON.stringify(group.meta) && group.roles.every((r,j)=>{const role=e.querySelectorAll('.resume-role')[j];return role.querySelector('h4').textContent===r.title && JSON.stringify(Array.from(role.querySelectorAll('.entry-meta'),p=>p.textContent))===JSON.stringify(r.meta) && JSON.stringify(Array.from(role.querySelectorAll('.entry-description'),p=>p.textContent))===JSON.stringify(r.description);});})`), true, 'All original employment values render unchanged');
  assert.equal(await evaluate(`CONTENT.resume.education.every((entry,i)=>{const e=document.querySelectorAll('.education-entry')[i];return e.querySelector('h3').textContent===entry.institution && e.querySelector('p').textContent===entry.degree && e.querySelector('.entry-meta').textContent===entry.date;})`), true, 'Education fidelity');
  assert.equal(await evaluate(`CONTENT.resume.certifications.every((c,i)=>{const e=document.querySelectorAll('.certification-entry')[i];return e.querySelector('h3').textContent===c.name && e.querySelector('a').href===c.url;})`), true, 'Certification names and exact credential URLs');
  await evaluate(`window.__printed=false;window.print=()=>window.__printed=true;document.querySelector('#print-resume').click()`);
  assert.equal(await evaluate('window.__printed'), true, 'Print button invokes native print');
  await send('Emulation.setEmulatedMedia', {media:'print'});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#print-resume')).display`), 'none');
  const pdf = await send('Page.printToPDF', {printBackground:false,preferCSSPageSize:true});
  fs.writeFileSync(path.join(artifacts,'resume.pdf'), Buffer.from(pdf.data,'base64'));
  await send('Emulation.setEmulatedMedia', {media:''});
  await evaluate(`document.querySelector('#primary-navigation a[href="#contact"]').click()`);
  await until(() => evaluate(`document.querySelector('#message-form') !== null`), 'Contact navigation');
  await evaluate('history.back()');await until(() => evaluate(`location.hash === '#resume'`), 'history back');
  await evaluate('history.forward()');await until(() => evaluate(`location.hash === '#contact'`), 'history forward');
  await checkContact();
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:false});
  await route('home');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#primary-navigation')).display`), 'none');
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'true');
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('#primary-navigation')).display`), 'none');
  await evaluate(`document.querySelector('#primary-navigation a[href="#resume"]').click()`);
  await until(() => evaluate(`document.querySelector('#main h1').textContent === 'Resume'`), 'mobile resume link');
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false', 'Menu closes after navigation');
  assert.equal(await evaluate('document.activeElement.id'), 'main', 'Navigation focuses page content');
  await evaluate(`document.querySelector('.menu-toggle').click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false');
  assert.equal(await evaluate('document.activeElement.className'), 'menu-toggle');
  await send('Page.navigate', {url:`${origin}/?keyboard-check#home`});
  await until(() => evaluate(`location.search === '?keyboard-check' && document.readyState === 'complete' && document.activeElement === document.body`), 'keyboard check document');
  for (const type of ['keyDown','keyUp']) await send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate('document.activeElement.className'), 'skip-link');
  for (const type of ['keyDown','keyUp']) await send('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await evaluate('document.activeElement.id'), 'main');
  await route(articleRoute,true);
  assert.equal(await evaluate(`document.querySelector('.blog-article time').dateTime`), '2025-06-30');
  assert.equal(await evaluate(`document.querySelectorAll('.markdown-body img').length`), 4);
  assert.equal(await evaluate(`document.querySelector('meta[property="og:type"]').content`), 'article');
  assert.equal(await evaluate(`document.querySelector('link[rel="canonical"]').href`), 'https://cs-cybersecurity.github.io/christopher-scott-io/#' + articleRoute);
  assert.equal(await evaluate(`document.querySelector('meta[property="article:published_time"]').content`), '2025-06-30T12:00:00Z');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('a')).some(a=>/editor/.test(a.href))`), false, 'No public editor links');
  await route('home');
  assert.equal(await evaluate(`document.querySelector('[data-blog-metadata]')`), null, 'Article metadata removed on navigation');
  await checkEditor();
  assert.deepEqual(errors, [], 'No browser runtime or failed-resource errors');
  console.log('PASS: Home, Resume and Contact at all five requested viewport sizes; loaded images, full photo framing, desktop hero fit and no horizontal overflow.');
  console.log('PASS: exact resume content/credentials, CEH first, navigation/history, mobile menu, keyboard skip link, print action and saved PDF.');
  console.log('PASS: mocked contact endpoint/payload, name inclusion, validation, length boundaries, spam prevention, duplicate prevention and failure feedback. No live submission or email delivery tested.');
  console.log('Saved viewport screenshots, full homepage screenshots and resume.pdf in qa-artifacts/.');
  console.log('PASS: Blog/articles at all five sizes, metadata, four original images, independent local editor import/save/create/preview and draft round trip.');
})().catch(error => {console.error(error);process.exitCode = 1;}).finally(async () => {
  if (socket?.readyState === WebSocket.OPEN) {try {await send('Browser.close');} catch {} socket.close();}
  for (const request of requests.values()) {clearTimeout(request.timer);request.reject(Error('Browser closed'));}
  if (browser && !browser.killed) browser.kill();
  if (server && !server.killed) server.kill();
  for (const file of temporaryPosts) if (fs.existsSync(file)) fs.unlinkSync(file);
  if (temporaryPosts.length) execFileSync(process.execPath, ['scripts/build-blog.mjs'], {cwd:root});
});

'use strict';

// Browser QA with the locally installed Chrome and native DevTools protocol.
// No browser library or downloaded dependencies. Artifacts stay in qa-artifacts/.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(root, 'qa-artifacts');
const origin = 'http://127.0.0.1:3000';
const debugPort = 9237;
const chromePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
const errors = [];
const navigations = [];
let server, chrome, socket;
let sequence = 0;
const requests = new Map();

async function until(action, message, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const result = await action(); if (result) return result; } catch {}
    await delay(100);
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
  if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
  return result.result.value;
}
async function navigate(route) {
  await send('Page.navigate', {url: `${origin}/${route}`});
  await until(() => evaluate(`document.readyState === 'complete' && location.hash === ${JSON.stringify(route)}`), `navigate ${route}`);
  await delay(150);
}
async function route(route) {
  await evaluate(`location.hash = ${JSON.stringify(route)}`);
  await until(() => evaluate(`location.hash === ${JSON.stringify(route)} && document.querySelector('#main h1') !== null`), route);
  await delay(150);
}
async function screenshot(name) {
  const shot = await send('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  fs.writeFileSync(path.join(artifacts, name), Buffer.from(shot.data, 'base64'));
}
async function checkLayout() {
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false, 'Horizontal overflow');
  assert.equal(await evaluate(`document.querySelectorAll('#main h1').length`), 1, 'Exactly one page heading');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('a')).some(a => !a.getAttribute('href'))`), false, 'No empty links');
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('#main [aria-labelledby]')).some(e=>!document.getElementById(e.getAttribute('aria-labelledby')))`), false, 'Heading associations');
}

(async () => {
  assert.ok(chromePath, 'A local Chrome or Edge installation is needed');
  fs.mkdirSync(artifacts, {recursive:true});
  // Refuse to reuse an unknown server or debugging port.
  for (const url of [origin, `http://127.0.0.1:${debugPort}/json/version`]) {
    let occupied = false;
    try { await fetch(url); occupied = true; } catch {}
    assert.equal(occupied, false, `Port already in use: ${url}`);
  }
  server = spawn(process.execPath, ['server.js'], {cwd:root, windowsHide:true, stdio:'ignore'});
  await until(async () => (await fetch(origin)).status === 200, 'local server');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'christopher-site-browser-'));
  chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-default-apps', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${debugPort}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide:true, stdio:'ignore'});
  const target = await until(async () => (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(page => page.type==='page'), 'Chrome DevTools');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message', event => {
    const data = JSON.parse(String(event.data));
    if (data.id && requests.has(data.id)) {
      const request = requests.get(data.id);requests.delete(data.id);clearTimeout(request.timer);
      if (data.error) request.reject(Error(JSON.stringify(data.error))); else request.resolve(data.result);
    }
    if(data.method === 'Page.frameRequestedNavigation') navigations.push(data.params.url);
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails);
    if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') errors.push(data.params.entry);
    if (data.method === 'Network.responseReceived' && data.params.response.status >= 400) errors.push(data.params.response);
  });
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
  // Contact tests never send a live email. Block the endpoint as a second safeguard.
  await send('Network.setBlockedURLs',{urls:['*://script.google.com/*','*://script.googleusercontent.com/*']});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__contactRequests=[];
    window.__contactMode='pending';
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,options)=>{
      if(String(input).startsWith('https://script.google.com/')){
        window.__contactRequests.push({url:String(input),method:options.method,mode:options.mode,credentials:options.credentials,body:Array.from(options.body.entries())});
        if(window.__contactMode==='failure') return Promise.reject(new TypeError('Simulated offline connection'));
        if(window.__contactMode==='http-failure') return Promise.resolve({type:'basic',ok:false,status:500});
        return new Promise(resolve=>window.__completeContact=()=>resolve({type:'opaque',ok:false,status:0}));
      }
      return nativeFetch(input,options);
    };
  `});
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('#home');
  assert.equal(await evaluate(`document.querySelector('#main h1').textContent`), 'IT Consulting, Cybersecurity & Web Development');
  assert.equal(await evaluate(`document.querySelector('.hero-description').textContent`), 'Expert technology services to build, secure, and modernize your business. From custom web applications and cloud infrastructure to cybersecurity assessments and compliance, we deliver practical solutions for growing organizations.');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#primary-navigation a'),a=>a.textContent)`), ['Home','Services','Resume','Blog','Contact']);
  assert.equal(await evaluate(`document.querySelector('.services-overview').children.length`),6);
  await checkLayout();await screenshot('home-desktop.png');
  await route('#services');
  assert.equal(await evaluate(`document.querySelectorAll('.service-list li').length`),52);
  assert.equal(await evaluate(`CATALOG.slice(1).every((c,i)=>c.items.every((item,j)=>item.title===CONTENT.services[i].items[j].title))`),true);
  const details=await evaluate(`CATALOG.flatMap(c=>c.items.map(item=>({url:'#services/'+c.id+'/'+item.id,title:item.title})))`);
  assert.equal(new Set(details.map(d=>d.url)).size,52);
  for(const detail of details){
    await route(detail.url);
    assert.equal(await evaluate(`document.querySelector('#main h1').textContent`),detail.title);
    assert.equal(await evaluate(`document.querySelector('.detail-action a').textContent`),'Book a Consultation');
    assert.equal(await evaluate(`document.querySelectorAll('.service-detail li').length`),3);
    assert.equal(await evaluate(`document.querySelector('.detail-overview').textContent.endsWith('\u2026')`),false);
    await checkLayout();
  }
  await navigate(details[0].url);
  await send('Page.reload');await delay(250);
  assert.equal(await evaluate(`document.querySelector('#main h1').textContent`),details[0].title);
  await screenshot('service-detail-desktop.png');
  await evaluate(`document.querySelector('.detail-action a').click()`);await delay(200);
  assert.ok(await evaluate(`document.querySelector('#message').value.includes(${JSON.stringify(details[0].title)})`));
  assert.equal(await evaluate(`document.querySelector('.email-display a').href`),'mailto:chris@christopher-scott.net');
  assert.equal(await evaluate(`document.querySelector('.contact-page').textContent.includes('christopher.scott.biz@gmail.com')`),false);
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#message-form label'),l=>l.textContent)`),['Email Address','Message']);
  assert.equal(await evaluate(`document.querySelector('#visitor-email').type`),'email');
  assert.equal(await evaluate(`document.querySelector('#visitor-email').autocomplete`),'email');
  assert.equal(await evaluate(`document.querySelector('#visitor-email').maxLength`),254);
  assert.equal(await evaluate(`document.querySelector('[name=website]').hidden`),true);
  await evaluate(`document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate(`window.__contactRequests.length`),0,'Email is required');
  await evaluate(`document.querySelector('#visitor-email').value='not-an-email';document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate(`window.__contactRequests.length`),0,'Invalid email blocked');
  await evaluate(`document.querySelector('#visitor-email').value='visitor@example.com';document.querySelector('#message').value='short';document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate(`window.__contactRequests.length`),0,'Minimum length enforced');
  await evaluate(`document.querySelector('#message').value=' '.repeat(20);document.querySelector('#message-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);
  assert.equal(await evaluate(`window.__contactRequests.length`),0,'Whitespace-only message blocked');
  await evaluate(`document.querySelector('#message').value='x'.repeat(5001);document.querySelector('#message-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);
  assert.equal(await evaluate(`window.__contactRequests.length`),0,'Maximum length enforced');
  await evaluate(`document.querySelector('#message').value=${JSON.stringify('Hello & thank you.\nA project inquiry.')};document.querySelector('#message').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate(`window.__contactRequests.length`),1);
  assert.equal(await evaluate(`document.querySelector('#message-form button').disabled`),true);
  await evaluate(`document.querySelector('#message-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);
  assert.equal(await evaluate(`window.__contactRequests.length`),1,'Duplicate submission blocked');
  const submission=await evaluate(`window.__contactRequests[0]`);
  assert.equal(submission.url,'https://script.google.com/macros/s/AKfycbyApUCyiSJnz4StzEvdMwLX7ib0fnWCidAvpVbR8g6fmHoLlmjUbzgqq3dh4pvzRGR3FQ/exec');
  assert.equal(submission.method,'POST');assert.equal(submission.mode,'no-cors');
  assert.deepEqual(submission.body.map(pair=>pair[0]),['email','message','website']);
  const parameters=Object.fromEntries(submission.body);
  assert.equal(parameters.email,'visitor@example.com');assert.equal(parameters.website,'');
  assert.ok(parameters.message.includes(details[0].title),'Service context retained');
  assert.ok(parameters.message.includes('Hello & thank you.\nA project inquiry.'));
  await evaluate(`window.__completeContact()`);await delay(50);
  assert.equal(await evaluate(`document.querySelector('#message-form button').disabled`),false);
  assert.ok(await evaluate(`document.querySelector('#email-status').textContent.includes('Delivery could not be confirmed')`));
  await route('#contact');
  await evaluate(`document.querySelector('#visitor-email').value='visitor@example.com';document.querySelector('#message').value='x'.repeat(5000);document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate(`window.__contactRequests.length`),2,'5000-character message allowed');
  await evaluate(`window.__completeContact()`);await delay(50);
  await evaluate(`window.__contactMode='failure';document.querySelector('#message-form').requestSubmit()`);await delay(50);
  assert.ok(await evaluate(`document.querySelector('#email-status').textContent.includes('Unable to submit')`));
  assert.equal(await evaluate(`document.querySelector('#message').value.length`),5000,'Message retained after failure');
  assert.equal(await evaluate(`document.querySelector('#message-form button').disabled`),false);
  await evaluate(`window.__contactMode='http-failure';document.querySelector('#message-form').requestSubmit()`);await delay(50);
  assert.ok(await evaluate(`document.querySelector('#email-status').textContent.includes('Unable to submit')`));
  const prior=await evaluate(`window.__contactRequests.length`);
  await evaluate(`document.querySelector('[name=website]').value='spam.example';document.querySelector('#message-form').requestSubmit()`);
  assert.equal(await evaluate(`window.__contactRequests.length`),prior,'Honeypot blocks submission');
  assert.equal(navigations.some(url=>url.startsWith('mailto:')),false,'Send Message never opens an email app');
  await checkLayout();await screenshot('contact-desktop.png');
  if(process.argv.includes('--contact-only')){
    for(const width of [820,390,320]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      await route('#contact');await checkLayout();
      if(width===390) await screenshot('contact-mobile.png');
    }
    assert.deepEqual(errors,[],'No runtime or resource errors');
    console.log('PASS: business email, accessible field order, exact mocked POST endpoint/parameters, service context, validation, duplicate prevention, honeypot and network/HTTP failure feedback.');
    console.log('PASS: no mailto submission, desktop/tablet/mobile layout and no browser errors. No live request or email delivery was tested.');
    return;
  }
  await route('#services');
  const ids = await evaluate(`Array.from(document.querySelectorAll('.service-category'),section=>section.id)`);
  for (const id of ids) {
    await route(`#services/${id}`);
    assert.equal(await evaluate(`document.activeElement.id`),id,'Category target receives keyboard focus');
    assert.ok(await evaluate(`document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().top >= 0 && document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().top < innerHeight - 100`),'Category heading in view');
  }
  await navigate('#services/compliance-audit');await checkLayout();await screenshot('services-desktop.png');
  await route('#resume');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.resume-section > h2'),h=>h.textContent)`), ['Experience','Education','Licenses & Certifications']);
  assert.equal(await evaluate(`document.querySelectorAll('.resume-role').length`),11);
  assert.equal(await evaluate(`document.querySelectorAll('.education-entry').length`),2);
  assert.equal(await evaluate(`document.querySelectorAll('.certification-entry').length`),7);
  assert.equal(await evaluate(`CONTENT.resume.experience.every((group,i)=>{const e=document.querySelectorAll('.experience-group')[i];return (!group.grouped || e.querySelector('h3').textContent===group.employer) && group.roles.every((r,j)=>{const role=e.querySelectorAll('.resume-role')[j];return role.querySelector('h4').textContent===r.title && JSON.stringify(Array.from(role.querySelectorAll('.entry-meta'),p=>p.textContent))===JSON.stringify(r.meta) && JSON.stringify(Array.from(role.querySelectorAll('.entry-description'),p=>p.textContent))===JSON.stringify(r.description);});})`),true,'Rendered experience fidelity');
  assert.equal(await evaluate(`CONTENT.resume.certifications.every((c,i)=>document.querySelectorAll('.certification-entry a')[i].href===c.url)`),true,'Exact credential URLs');
  await checkLayout();await screenshot('resume-desktop.png');
  await send('Emulation.setEmulatedMedia',{media:'print'});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#print-resume')).display`),'none');
  const pdf=await send('Page.printToPDF',{printBackground:false,preferCSSPageSize:true});fs.writeFileSync(path.join(artifacts,'resume.pdf'),Buffer.from(pdf.data,'base64'));
  await send('Emulation.setEmulatedMedia',{media:''});
  await route('#blog');
  assert.equal(await evaluate(`document.querySelector('.blog-post-summary time').getAttribute('datetime')`),'2025-06-30');
  assert.equal(await evaluate(`document.querySelector('link[type="application/rss+xml"]').getAttribute('href')`),'rss.xml');
  assert.ok(await evaluate(`document.querySelector('.blog-post-summary h2').textContent.includes('Self-Host Next.js')`));
  await checkLayout(); await screenshot('blog-desktop.png');
  await evaluate(`document.querySelector('.blog-post-summary h2 a').click()`);await delay(150);
  assert.equal(await evaluate(`document.querySelector('#main h1').textContent`),'Self-Host Next.js with Docker and Nginx');
  assert.ok(await evaluate(`document.querySelectorAll('.markdown-body pre').length > 15`));
  assert.equal(await evaluate(`document.querySelectorAll('.blog-missing-image').length`),0);
  assert.ok(await evaluate(`document.title.startsWith('Self-Host Next.js')`));
  assert.equal(await evaluate(`document.querySelectorAll('.markdown-body img').length`),4);
  await evaluate(`document.querySelectorAll('.markdown-body img').forEach(img=>img.loading='eager')`);
  await until(()=>evaluate(`Array.from(document.querySelectorAll('.markdown-body img')).every(img=>img.complete && img.naturalWidth>0)`),'four blog screenshots loaded');
  await checkLayout();await screenshot('blog-post-desktop.png');
  await evaluate('history.back()');await until(()=>evaluate(`location.hash==='#blog'`),'blog back');
  await evaluate('history.forward()');await until(()=>evaluate(`document.querySelector('.markdown-body')!==null`),'blog forward');
  await send('Page.reload');await delay(200);assert.ok(await evaluate(`document.querySelector('.markdown-body')!==null`));
  const rss=await fetch(origin+'/rss.xml');assert.equal(rss.status,200);assert.ok(rss.headers.get('content-type').includes('application/rss+xml'));
  await send('Page.navigate',{url:origin+'/blog-editor.html'});
  await until(()=>evaluate(`document.querySelector('#post-file')!==null`),'local editor');
  const {root:dom}=await send('DOM.getDocument');
  const input=await send('DOM.querySelector',{nodeId:dom.nodeId,selector:'#post-file'});
  await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path.join(root,'posts/2025-06-30-self-host-nextjs-with-docker-and-nginx.md')]});
  await until(()=>evaluate(`document.querySelector('#post-title').value==='Self-Host Next.js with Docker and Nginx'`),'Markdown import');
  assert.equal(await evaluate(`document.querySelector('#post-date').value`),'2025-06-30');
  assert.ok(await evaluate(`document.querySelector('#post-body').value.includes('docker build -t my-nextjs-app .')`));
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:artifacts});
  await evaluate(`document.querySelector('#post-editor').requestSubmit()`);
  await until(()=>fs.existsSync(path.join(artifacts,'2025-06-30-self-host-next-js-with-docker-and-nginx.md')),'saved Markdown download');
  assert.ok(fs.readFileSync(path.join(artifacts,'2025-06-30-self-host-next-js-with-docker-and-nginx.md'),'utf8').includes('slug: self-host-nextjs-with-docker-and-nginx'));
  await send('Page.navigate',{url:origin+'/#blog'});await until(()=>evaluate(`document.querySelector('.blog-post-summary')!==null`),'return from editor');

  await route('#contact');assert.equal(await evaluate(`document.querySelector('.email-display a').href`),'mailto:chris@christopher-scott.net');await checkLayout();
  // History uses actual in-page links and browser navigation.
  await evaluate(`document.querySelector('#primary-navigation a[href="#services"]').click()`);await delay(150);
  await evaluate('history.back()');await until(()=>evaluate('location.hash==="#contact"'),'history back');
  await evaluate('history.forward()');await until(()=>evaluate('location.hash==="#services"'),'history forward');
  await navigate('#resume');assert.equal(await evaluate(`document.querySelector('#main h1').textContent`),'Resume');
  // Tablet and small phones, including every long-content view.
  for (const width of [820,390,320]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    for (const page of ['home','services','resume','blog','blog/self-host-nextjs-with-docker-and-nginx','contact','services/compliance-audit/international-organization-for-standardization-iso-27001']) {await route(`#${page}`);await checkLayout();}
    if (width===390) {
      await route('#home');await screenshot('home-mobile.png');
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('#primary-navigation')).display`),'none');
      await evaluate(`document.querySelector('.menu-toggle').click()`);
      assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`),'true');
      assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('#primary-navigation')).display`),'none');
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
      assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`),'false');
      // Use a real tab sequence for the skip link.
      await send('Page.navigate',{url:`${origin}/?keyboard-check#home`});
      await until(()=>evaluate(`location.search === '?keyboard-check' && document.readyState === 'complete' && document.activeElement === document.body`),'fresh document for keyboard test');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      assert.equal(await evaluate(`document.activeElement.className`),'skip-link');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      assert.equal(await evaluate('document.activeElement.id'),'main');
      await route('#blog/self-host-nextjs-with-docker-and-nginx');await screenshot('blog-post-mobile.png');
      await route('#services');await screenshot('services-mobile.png');
      await route('#resume');await screenshot('resume-mobile.png');
    }
  }
  assert.deepEqual(errors,[],'No browser runtime or resource errors');
  console.log('PASS: exact hero, 52 service details and mocked Apps Script POST, resume content/credentials, Markdown Blog/RSS/editor, Apps Script Contact (delivery not tested).');
  console.log('PASS: direct routes, six category links, browser back/forward, mobile menu, Escape, keyboard skip link, print/PDF.');
  console.log('PASS: desktop 1440px, tablet 820px, phones 390px/320px; no horizontal overflow, runtime errors or failed resources.');
  console.log('Saved desktop/mobile screenshots and resume PDF in qa-artifacts/.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch{}socket.close();}
  for(const request of requests.values()){clearTimeout(request.timer);request.reject(Error('Browser closed'));}
  if(chrome&&!chrome.killed)chrome.kill();if(server&&!server.killed)server.kill();
});

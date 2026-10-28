'use strict';

(() => {
  const main = document.querySelector('#main');
  const homeHTML = main.innerHTML;
  const navigation = document.querySelector('#primary-navigation');
  const menu = document.querySelector('.menu-toggle');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const paragraphs = (lines = [], className = '') => lines.map(line => `<p${className ? ` class="${className}"` : ''}>${escape(line)}</p>`).join('');
  const safeURL = value => {
    try { const url = new URL(value, location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  const externalLink = (url, label, className = 'text-link') => `<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>`;
  const linkedinURL = safeURL(SITE.linkedin);
  const heading = (title, text = '', kicker = '') => `<header class="page-heading">${kicker ? `<p class="page-kicker">${escape(kicker)}</p>` : ''}<h1>${escape(title)}</h1>${text ? `<p class="lead">${escape(text)}</p>` : ''}</header>`;

  function homeExtras() {
    const credentialArtwork = {'CompTIA PenTest+':'pentest.png','CompTIA Project+':'project.png','CompTIA Cybersecurity Analyst (CySA+)':'cysa.png','CompTIA Security+':'security.png','CompTIA Network+':'network.png','CompTIA A+':'a-plus.png','Certified Ethical Hacker (CEH)':'ec-council-issuer.webp'};
    const homepageCertifications = [...CONTENT.resume.certifications].sort((a,b) => Number(b.name === 'Certified Ethical Hacker (CEH)') - Number(a.name === 'Certified Ethical Hacker (CEH)'));
    document.querySelector('#home-certification-list').innerHTML = homepageCertifications.map(cert => {
      const artwork = credentialArtwork[cert.name];
      const issuerLogo = cert.name === 'Certified Ethical Hacker (CEH)';
      return `<li><a class="home-credential" href="${escape(cert.url)}" target="_blank" rel="noopener noreferrer">${artwork ? `<img class="${issuerLogo ? 'credential-issuer-logo' : 'credential-badge'}" src="assets/certifications/${artwork}" alt="${issuerLogo ? 'EC-Council issuer logo' : ''}" width="64" height="64" loading="lazy" decoding="async">` : ''}<span><strong>${escape(cert.name)}</strong><small>${escape(cert.issuer)}</small></span></a></li>`;
    }).join('');
  }
  const logos = {'Bank of America':'bank-of-america.jpg','Trustwave, A LevelBlue Company':'trustwave.ico','Trustwave':'trustwave.ico','Transwest':'transwest.svg','Lumen Technologies':'lumen.png','City and County of Denver':'denver.ico','Front Range Community College':'frcc.svg'};
  function companyMark(group) {
    const initials=group.employer.split(/[ ,]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('');
    const asset=logos[group.employer];
    return `<span class="company-mark"><span aria-hidden="true">${escape(initials)}</span>${asset?`<img src="assets/employers/${asset}" alt="${escape(group.employer)} logo" width="44" height="44">`:''}</span>`;
  }
  function resumePage() {
    const resume = CONTENT.resume;
    return `<div class="container resume-page">
      <div class="resume-intro">${heading('Resume')}<button class="text-button" type="button" id="print-resume">Print / Save as PDF <span aria-hidden="true">↗</span></button></div>
      <section class="resume-section" aria-labelledby="experience-heading"><h2 id="experience-heading">Experience</h2><div>
        ${resume.experience.map(group => `<article class="experience-group"><div class="employer-header">${companyMark(group)}<div><h3>${escape(group.employer)}</h3>${paragraphs(group.meta, 'entry-meta')}</div></div><div class="role-timeline">${group.roles.map(role=>`<div class="resume-role"><h4>${escape(role.title)}</h4>${paragraphs(role.meta,'entry-meta')}${paragraphs(role.description,'entry-description')}</div>`).join('')}</div></article>`).join('')}
      </div></section>
      <section class="resume-section" aria-labelledby="education-heading"><h2 id="education-heading">Education</h2><div>
        ${resume.education.map(entry => `<article class="education-entry"><h3>${escape(entry.institution)}</h3><p>${escape(entry.degree)}</p><p class="entry-meta">${escape(entry.date)}</p>${paragraphs(entry.description, 'entry-description')}</article>`).join('')}
      </div></section>
      <section class="resume-section" aria-labelledby="certifications-heading"><h2 id="certifications-heading">Licenses &amp; Certifications</h2><div>
        ${resume.certifications.map(entry => `<article class="certification-entry"><h3>${escape(entry.name)}</h3><p>${escape(entry.issuer)}</p><p class="entry-meta">${escape(entry.date)}</p>${entry.credentialId ? `<p class="entry-meta">${escape(entry.credentialId)}</p>` : ''}${safeURL(entry.url) ? externalLink(safeURL(entry.url), 'Show credential') : ''}</article>`).join('')}
      </div></section>
    </div>`;
  }

  function contactPage() {
    return `<div class="container contact-page">${heading('Get in Touch',"I'm always open to connecting with fellow technology professionals, discussing cybersecurity research, and exploring meaningful professional opportunities.")}
      <div class="contact-layout">
        <div class="contact-methods">
          <section class="contact-method" aria-labelledby="contact-email"><h2 id="contact-email">Email</h2><a class="contact-detail" href="mailto:${escape(SITE.email)}">${escape(SITE.email)}</a><p>For professional correspondence and introductions.</p></section>
          <section class="contact-method" aria-labelledby="contact-linkedin"><h2 id="contact-linkedin">LinkedIn</h2><p>Connect with me professionally.</p>${externalLink(linkedinURL, 'View LinkedIn Profile')}</section>
          <section class="contact-method" aria-labelledby="contact-github"><h2 id="contact-github">GitHub</h2><p>Explore my public technical work.</p>${externalLink(safeURL(SITE.github), 'View GitHub Profile')}</section>
        </div>
        <form id="message-form" action="https://script.google.com/macros/s/AKfycbyApUCyiSJnz4StzEvdMwLX7ib0fnWCidAvpVbR8g6fmHoLlmjUbzgqq3dh4pvzRGR3FQ/exec" method="post">
          <label for="visitor-name">Name</label><input id="visitor-name" type="text" name="name" required maxlength="120" autocomplete="name">
          <label for="visitor-email">Email</label><input id="visitor-email" type="email" name="email" required maxlength="254" autocomplete="email">
          <input type="text" name="website" value="" hidden tabindex="-1" autocomplete="off" aria-hidden="true">
          <label for="message">Message</label><textarea id="message" name="message" rows="7" required minlength="10" maxlength="5000" aria-describedby="message-limit" placeholder="Share your message or introduce yourself."></textarea>
          <p class="email-note" id="message-limit">Up to 5,000 characters including your name. You can also email me directly.</p>
          <button type="submit" class="button">Send Message</button><p id="email-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>`;
  }

  const blogDate = date => new Intl.DateTimeFormat('en-US', {month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  function blogPage(slug) {
    const posts = window.BLOG_POSTS || [];
    const post = posts.find(entry => entry.slug === slug);
    if (slug && !post) return `<div class="container blog-page">${heading('Post not found')}<p>This post is unavailable.</p><a class="text-link" href="#blog">Back to Blog</a></div>`;
    if (post) return `<div class="container blog-article"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#blog">Blog</a></nav><header class="page-heading"><p class="page-kicker"><time datetime="${escape(post.date)}">${blogDate(post.date)}</time> · Christopher Scott</p><h1>${escape(post.title)}</h1></header><article class="markdown-body" aria-label="${escape(post.title)}">${post.html}</article><div class="blog-article-footer"><a class="text-link" href="#blog">Back to all posts</a><a class="text-link" href="rss.xml">Subscribe via RSS</a></div></div>`;
    return `<div class="container blog-page"><div class="blog-heading">${heading('Blog','Notes on infrastructure, development, and security.')}<a class="text-link" href="rss.xml">Subscribe via RSS</a></div><div class="blog-post-list">${posts.map(entry=>`<article class="blog-post-summary"><time datetime="${escape(entry.date)}">${blogDate(entry.date)}</time><div><h2><a href="#blog/${entry.slug}">${escape(entry.title)}</a></h2><p>${escape(entry.description)}</p><a class="text-link" href="#blog/${entry.slug}">Read article <span aria-hidden="true">→</span></a></div></article>`).join('')}</div></div>`;
  }

  // Absolute URLs are used only for Blog metadata; other pages keep their existing metadata.
  function blogMetadata(page, slug, post) {
    document.querySelectorAll('[data-blog-metadata]').forEach(element => element.remove());
    document.querySelector('meta[property="og:type"]').content = post ? 'article' : 'website';
    if (page !== 'blog') return;
    const baseURL = safeURL(SITE.url);
    const url = baseURL ? `${baseURL}#blog${slug && post ? `/${post.slug}` : ''}` : '';
    const addMeta = (property, content) => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.content = content;
      meta.dataset.blogMetadata = '';
      document.head.append(meta);
    };
    if (url) {
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = url;
      canonical.dataset.blogMetadata = '';
      document.head.append(canonical);
      addMeta('og:url', url);
    }
    if (post) {
      addMeta('article:published_time', `${post.date}T12:00:00Z`);
      addMeta('article:author', SITE.name);
    }
  }

  const pageTitles = {
    home: 'Christopher Scott | Cybersecurity & IT Professional',
    resume: 'Resume | Christopher Scott',
    blog: 'Blog | Christopher Scott',
    contact: 'Contact | Christopher Scott'
  };
  const descriptions = {
    home: 'Professional portfolio and resume of Christopher Scott, specializing in enterprise cybersecurity, IT infrastructure, detection engineering, malware analysis, and threat intelligence.',
    resume: 'Christopher Scott\u2019s professional experience, employment history, education, and verified licenses and certifications in cybersecurity and IT.',
    blog: 'Technical writing by Christopher Scott on infrastructure, development, and security.',
    contact: 'Connect with Christopher Scott for professional networking, cybersecurity research, and meaningful professional opportunities.'
  };

  function readRoute() {
    const [page, slug, anchor] = location.hash.slice(1).split('/');
    return {page: Object.hasOwn(pageTitles, page) ? page : 'home', slug, anchor};
  }

  function render({initial = false} = {}) {
    const {page, slug, anchor} = readRoute();
    const post = page === 'blog' ? (window.BLOG_POSTS || []).find(entry => entry.slug === slug) : null;
    main.innerHTML = page === 'home' ? homeHTML : page === 'resume' ? resumePage() : page === 'blog' ? blogPage(slug) : contactPage();
    if (page === 'home') homeExtras();
    document.querySelectorAll('.company-mark img').forEach(img => img.addEventListener('error', () => img.remove()));
    document.title = post ? `${post.title} | Christopher Scott` : pageTitles[page];
    document.querySelector('meta[name="description"]').content = post ? post.description : descriptions[page];
    document.querySelector('meta[property="og:title"]').content = document.title;
    document.querySelector('meta[property="og:description"]').content = document.querySelector('meta[name="description"]').content;
    blogMetadata(page, slug, post);
    navigation.querySelectorAll('a').forEach(link => {
      if (link.hash === `#${page}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    menu.setAttribute('aria-expanded', 'false');
    const target = page === 'blog' && post && anchor ? document.getElementById(anchor) : null;
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
      target.scrollIntoView({block: 'start', behavior: 'instant'});
    } else {
      if (!initial) main.focus({preventScroll: true});
      window.scrollTo({top: 0, left: 0, behavior: 'instant'});
    }
  }
  menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(menu.getAttribute('aria-expanded') !== 'true')));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      menu.setAttribute('aria-expanded', 'false');
      menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#print-resume')) window.print();
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (link.hash === '#main') {
      event.preventDefault();
      main.focus();
      return;
    }
    if (link.hash === location.hash) {
      event.preventDefault();
      render();
    }
  });
  document.addEventListener('input', event=>{
    if (event.target.form?.id !== 'message-form') return;
    event.target.setCustomValidity('');
    if (event.target.name === 'name') event.target.form.elements.message.setCustomValidity('');
  });
  document.addEventListener('submit', async event=>{
    if(event.target.id!=='message-form') return;
    event.preventDefault();
    const form=event.target;
    if(form.dataset.submitting === 'true') return;
    const visitorName=form.elements.namedItem('name');
    const email=form.elements.email;
    const message=form.elements.message;
    visitorName.value=visitorName.value.replace(/\s+/g, ' ').trim();
    email.value=email.value.trim();
    visitorName.setCustomValidity(!visitorName.value ? 'Please enter your name.' : visitorName.value.length > 120 ? 'Please use no more than 120 characters for your name.' : '');
    email.setCustomValidity(email.value.length > 254 ? 'Please use an email address with no more than 254 characters.' : '');
    message.setCustomValidity(message.value.trim().length < 10 ? 'Please enter at least 10 characters.' : message.value.length > 5000 ? 'Please use no more than 5,000 characters.' : '');
    if(!form.reportValidity()) return;
    // Keep the backend's existing field contract; the name travels in the message.
    const bodyMessage=`Name: ${visitorName.value}\n\n${message.value.trim()}`;
    if(bodyMessage.length > 5000){
      message.setCustomValidity('Please keep your message and name within 5,000 characters.');
      message.reportValidity();
      return;
    }
    const status=form.querySelector('#email-status');
    if(form.elements.website.value) { status.textContent='Unable to submit this message. Please email me directly.'; return; }
    const button=form.querySelector('button[type="submit"]');
    form.dataset.submitting='true';
    form.setAttribute('aria-busy','true');
    button.disabled=true;
    status.textContent='Submitting your message…';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(form.action,{
        method:'POST', mode:'no-cors', credentials:'omit', signal:controller.signal,
        body:new URLSearchParams({email:email.value,message:bodyMessage,website:''})
      });
      if(response.type !== 'opaque' && !response.ok) throw new Error('Submission failed');
      status.textContent="Submission request completed. Delivery could not be confirmed. If you don't hear back, please email me directly.";
    }catch(error){
      status.textContent=error.name === 'AbortError'
        ? 'The request timed out and submission could not be confirmed. Please email me directly.'
        : 'Unable to submit your message. Please check your connection and try again, or email me directly.';
    }finally{
      clearTimeout(timeout);
      form.dataset.submitting='false';
      form.removeAttribute('aria-busy');
      button.disabled=false;
    }
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', () => render());
  render({initial: true});
})();

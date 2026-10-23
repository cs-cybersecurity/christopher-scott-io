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

  const serviceLink = (category, item) => `#services/${category.id}/${item.id}`;
  function homeExtras() {
    document.querySelector('.services-overview').innerHTML = CATALOG.map((category,index)=>`<article class="overview-item"><span class="item-number">${String(index+1).padStart(2,'0')}</span><div><h3><a href="#services/${category.id}">${escape(category.title)}</a></h3><p>${escape(category.summary)}</p><a class="text-link" href="#services/${category.id}">${category.items.length} services &rarr; Explore</a></div></article>`).join('');
    document.querySelector('.background-preview').innerHTML = `<div class="section-heading"><p class="section-label">Professional credentials</p><h2>8+ Years of Hands-On Experience</h2></div><div><h3>Professional Certifications</h3><ul class="credentials-list">${CONTENT.resume.certifications.map(cert=>`<li>${externalLink(cert.url,cert.name)}</li>`).join('')}</ul><a class="text-link" href="#resume">View Full Resume &rarr;</a></div>`;
  }
  function servicesPage() {
    return `<div class="container">${heading('Services','Browse my services, then select an offering to learn how I can help.','Technology Consulting')}<div class="directory-layout"><aside class="directory-nav"><nav aria-label="Service categories"><p class="section-label">Browse services</p>${CATALOG.map(category=>`<a href="#services/${category.id}">${escape(category.title)} <span class="count">${category.items.length}</span></a>`).join('')}</nav></aside><div class="directory-content">${CATALOG.map(category=>`<section class="service-category" id="${category.id}" aria-labelledby="${category.id}-heading"><div class="category-heading"><p class="section-label">${category.items.length} offerings${category.origin==='New offerings'?' / New web development offerings':''}</p><h2 id="${category.id}-heading">${escape(category.title)}</h2><p class="category-intro">${escape(category.summary)}</p></div><ol class="service-list">${category.items.map((item,index)=>`<li><a href="${serviceLink(category,item)}"><span class="list-number">${String(index+1).padStart(2,'0')}</span><span>${escape(item.title)}</span><span aria-hidden="true">&rarr;</span></a></li>`).join('')}</ol></section>`).join('')}</div></div></div>`;
  }
  function serviceDetail(category,item) {
    return `<div class="container service-detail"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#services">Services</a><span aria-hidden="true"> / </span><a href="#services/${category.id}">${escape(category.title)}</a></nav>${heading(item.title,'',category.title)}<section aria-labelledby="overview-title"><h2 id="overview-title">Overview</h2><p class="detail-overview">${escape(item.overview)}</p></section><section aria-labelledby="help-title"><h2 id="help-title">How I Can Help</h2><ul>${item.help.map(point=>`<li>${escape(point)}</li>`).join('')}</ul></section><div class="detail-action"><a class="button" href="#contact/${category.id}/${item.id}">Book a Consultation</a><p>Discuss your requirements directly with me.</p></div></div>`;
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

  function contactPage(selected) {
    return `<div class="container contact-page">${heading('Get in Touch',"Have a project or technical challenge you'd like to discuss? Send me a message.")}<p class="email-display"><span>Email</span><a href="mailto:christopher.scott.biz@gmail.com">christopher.scott.biz@gmail.com</a></p><form id="message-form">${selected?`<p class="service-context">Regarding: ${escape(selected.title)}</p>`:''}<label for="message">Message</label><textarea id="message" name="message" rows="7" required maxlength="6000" placeholder="Tell me about your project or technical challenge.">${selected?escape(`I'd like to discuss ${selected.title}.`):''}</textarea><p class="email-note">Send Message opens a draft in your configured email app. Review and send it there; the website does not deliver email.</p><button type="submit" class="button">Send Message</button><p id="email-status" role="status"></p></form></div>`;
  }

  const blogDate = date => new Intl.DateTimeFormat('en-US', {month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  function blogPage(slug) {
    const posts = window.BLOG_POSTS || [];
    const post = posts.find(entry => entry.slug === slug);
    if (slug && !post) return `<div class="container blog-page">${heading('Post not found')}<p>This post is unavailable.</p><a class="text-link" href="#blog">Back to Blog</a></div>`;
    if (post) return `<div class="container blog-article"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#blog">Blog</a></nav><header class="page-heading"><p class="page-kicker"><time datetime="${escape(post.date)}">${blogDate(post.date)}</time> · Christopher Scott</p><h1>${escape(post.title)}</h1></header><article class="markdown-body" aria-label="${escape(post.title)}">${post.html}</article><div class="blog-article-footer"><a class="text-link" href="#blog">Back to all posts</a><a class="text-link" href="rss.xml">Subscribe via RSS</a></div></div>`;
    const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
    return `<div class="container blog-page"><div class="blog-heading">${heading('Blog','Notes on infrastructure, development, and security.')}<a class="text-link" href="rss.xml">Subscribe via RSS</a></div>${local ? '<p class="blog-local-tools"><a class="text-link" href="blog-editor.html">Add a local Markdown post</a></p>' : ''}<div class="blog-post-list">${posts.map(entry=>`<article class="blog-post-summary"><time datetime="${escape(entry.date)}">${blogDate(entry.date)}</time><div><h2><a href="#blog/${entry.slug}">${escape(entry.title)}</a></h2><p>${escape(entry.description)}</p><a class="text-link" href="#blog/${entry.slug}">Read article <span aria-hidden="true">→</span></a></div></article>`).join('')}</div></div>`;
  }

  const pageTitles = {
    home: 'Christopher Scott | IT Consulting, Cybersecurity & Web Development',
    services: 'Services | Christopher Scott — Technology Consulting',
    resume: 'Resume | Christopher Scott',
    blog: 'Blog | Christopher Scott',
    contact: 'Contact | Christopher Scott'
  };
  const descriptions = {
    home: 'Work directly with Christopher Scott, an independent technology consultant providing IT consulting, cybersecurity, cloud infrastructure, compliance consulting and web development.',
    services: 'Explore cybersecurity, compliance, cloud and IT consulting, web development, and technical advisory services from Christopher Scott.',
    resume: 'Christopher Scott’s professional experience, education, and licenses and certifications, as supplied from LinkedIn.',
    blog: 'Blog | Christopher Scott.',
    contact: 'Contact Christopher Scott directly about IT consulting, cybersecurity, cloud infrastructure, compliance consulting and web development.'
  };

  function readRoute() {
    const [page, section, service] = location.hash.slice(1).split('/');
    return {page: Object.hasOwn(pageTitles, page) ? page : 'home', section, service};
  }

  function render({initial = false} = {}) {
    const {page, section, service} = readRoute();
    const category = CATALOG.find(c=>c.id===section);
    const selected = category?.items.find(item=>item.id===service);
    main.innerHTML = page === 'home' ? homeHTML : page === 'services' ? (selected ? serviceDetail(category,selected) : servicesPage()) : page === 'resume' ? resumePage() : page === 'blog' ? blogPage(section) : contactPage(selected);
    if(page==='home') homeExtras();
    document.querySelectorAll('.company-mark img').forEach(img=>img.addEventListener('error',()=>img.remove()));
    document.title = selected && page==='services' ? `${selected.title} | Christopher Scott` : pageTitles[page];
    document.querySelector('meta[name="description"]').content = selected && page==='services' ? selected.overview : descriptions[page];
    if (page === 'blog' && section) {
      const post = (window.BLOG_POSTS || []).find(entry => entry.slug === section);
      if (post) { document.title = `${post.title} | Christopher Scott`; document.querySelector('meta[name="description"]').content = post.description; }
    }
    document.querySelector('meta[property="og:title"]').content = document.title;
    document.querySelector('meta[property="og:description"]').content = document.querySelector('meta[name="description"]').content;
    const baseURL = safeURL(SITE.url) || 'https://christopher-scott.net/';
    document.querySelector('meta[property="og:url"]').content = page === 'home' ? baseURL : `${baseURL}${location.hash}`;
    navigation.querySelectorAll('a').forEach(link => {
      if (link.hash === `#${page}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    menu.setAttribute('aria-expanded', 'false');

    if (page === 'home' && SITE.photoUrl) {
      const photoURL = safeURL(SITE.photoUrl);
      if (photoURL) {
        const image = document.createElement('img');
        image.className = 'personal-photo';
        image.src = photoURL;
        image.alt = SITE.photoAlt || 'Christopher Scott';
        image.width = 160;
        image.height = 200;
        image.loading = 'lazy';
        image.addEventListener('error', () => image.remove());
        document.querySelector('#personal-photograph').append(image);
      }
    }

    const target = page === 'services' && section && !selected ? document.getElementById(section) : null;
    if (target) {
      document.querySelectorAll('.directory-nav a').forEach(link => {
        if (link.hash === `#services/${section}`) link.setAttribute('aria-current', 'true');
      });
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
  document.addEventListener('submit', event=>{
    if(event.target.id!=='message-form') return;
    event.preventDefault();
    const {section,service}=readRoute();
    const selected=CATALOG.find(c=>c.id===section)?.items.find(i=>i.id===service);
    const subject=selected ? `Consultation: ${selected.title}` : 'Technology consulting inquiry';
    const message=document.querySelector('#message').value;
    const url=`mailto:christopher.scott.biz@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    document.querySelector('#email-status').innerHTML=`<span>Email draft requested. Send it from your email app. If it did not open, </span><a href="${escape(url)}">open the draft again</a><span> or email me directly.</span>`;
    window.location.href=url;
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', () => render());
  render({initial: true});
})();

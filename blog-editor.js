'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const now = new Date();
  $('post-date').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  $('post-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    let body = (await file.text()).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
    $('post-title').value = file.name.replace(/\.md$/i,'').replace(/^\d+[\s-]+/,'').replace(/-/g,' ');
    $('post-description').value = '';
    if (body.startsWith('---\n')) {
      const end = body.indexOf('\n---\n',4);
      if (end < 0) { $('editor-status').textContent = 'The file has unclosed metadata. Please correct it before importing.'; return; }
      const metadata = body.slice(4,end);
      for (const [key,id] of [['title','post-title'],['date','post-date'],['description','post-description']]) {
        const value = metadata.match(new RegExp(`^${key}:\\s*(.*)$`,'m'))?.[1];
        if (value !== undefined) { try { $(id).value = value.startsWith('"') ? JSON.parse(value) : value.replace(/^'|'$/g,''); } catch { $(id).value = value; } }
      }
      // Retain metadata such as slug/draft on round trips.
      $('post-editor').dataset.extra = metadata.split('\n').filter(line=>/^(slug|draft):/.test(line)).join('\n');
      body = body.slice(end+5);
    } else $('post-editor').dataset.extra = '';
    $('post-body').value = body;
    $('editor-status').textContent = 'File loaded. Review the title and date, then save the Markdown file.';
  });
  $('post-editor').addEventListener('submit', event => {
    event.preventDefault();
    const title = $('post-title').value.trim();
    if (!title) { $('post-title').focus(); return; }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'post';
    const date = $('post-date').value;
    const extra = event.target.dataset.extra;
    const content = `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\n${$('post-description').value ? `description: ${JSON.stringify($('post-description').value)}\n` : ''}${extra ? extra+'\n' : ''}---\n\n${$('post-body').value}`;
    const url = URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
    const link = document.createElement('a'); link.href=url; link.download=`${date}-${slug}.md`; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('editor-status').textContent = `Saved ${link.download}. Place it in posts/, run npm run blog:build, then deploy the updated blog-data.js and rss.xml with your site.`;
  });
})();

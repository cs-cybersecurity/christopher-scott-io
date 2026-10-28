const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const publicBuild = process.argv.includes('--dist');
const editorEnabled = process.argv.includes('--editor') && !publicBuild;
const root = publicBuild ? path.join(__dirname, 'dist') : __dirname;
const files = new Set(['index.html', 'styles.css', 'app.js', 'config.js', 'content.js', 'favicon.svg', 'blog.css', 'blog-data.js', 'rss.xml']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.xml':'application/rss+xml; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const editorFiles = {'/blog-editor.html':'blog-editor.html', '/blog-editor.js':'blog-editor.js'};
http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405, {'Allow':'GET, HEAD'}).end();return;}
  let url;
  try {url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);} catch {res.writeHead(400).end();return;}
  if (editorEnabled && ['/blog-editor','/blog-editor/'].includes(url)) {res.writeHead(302, {'Location':'/blog-editor.html'}).end();return;}
  let file;
  if (editorEnabled && Object.hasOwn(editorFiles, url)) file = path.join(__dirname, editorFiles[url]);
  else {
    const relative = url === '/' ? 'index.html' : url.slice(1);
    if (!files.has(relative) && !relative.startsWith('assets/')) {res.writeHead(404).end('Not found');return;}
    file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) {res.writeHead(404).end('Not found');return;}
    if (relative.startsWith('assets/') && !file.startsWith(path.join(root, 'assets') + path.sep)) {res.writeHead(404).end('Not found');return;}
  }
  const type = types[path.extname(file)];
  if (!type) {res.writeHead(404).end('Not found');return;}
  fs.readFile(file, (err,data) => {
    if (err) {res.writeHead(404).end('Not found');return;}
    res.writeHead(200, {'Content-Type':type, 'X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(3000, '127.0.0.1', () => {
  console.log('Local preview: http://127.0.0.1:3000');
  if (editorEnabled) console.log('Local editor: http://127.0.0.1:3000/blog-editor.html');
});

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePost, buildBlog} from './build-blog.mjs';

const [source, ...args] = process.argv.slice(2);
if (!source) throw Error('Usage: npm run blog:import -- "path/to/post.md" --date YYYY-MM-DD --title "Post title"');
const options = {};
for (let i=0; i<args.length; i+=2) {
  if (!['--date','--title'].includes(args[i]) || !args[i+1]) throw Error('Only --date and --title options are supported.');
  options[args[i].slice(2)] = args[i+1];
}
let markdown = fs.readFileSync(path.resolve(source),'utf8').replace(/^\uFEFF/,'');
if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) {
  const title = options.title || path.basename(source,'.md').replace(/^\d+[\s-]+/,'');
  const date = options.date || path.basename(source).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) throw Error('Provide --date YYYY-MM-DD for a file without publication metadata.');
  markdown = `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\n---\n\n${markdown}`;
} else if (Object.keys(options).length) throw Error('This file already has metadata. Edit its title/date there, then import without flags.');
const post = parsePost(markdown,path.basename(source));
if (!post) throw Error('This is a draft. Copy it to posts/ directly to keep it unpublished.');
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../posts');
fs.mkdirSync(directory,{recursive:true});
for (const filename of fs.readdirSync(directory).filter(name=>/\.md$/i.test(name) && name.toLowerCase()!=='readme.md')) {
  const existing = parsePost(fs.readFileSync(path.join(directory,filename),'utf8'),filename);
  if (existing?.slug === post.slug) throw Error('A post with this slug already exists. Edit its file in posts/ instead.');
}
const destination = path.join(directory,`${post.date}-${post.slug}.md`);
fs.writeFileSync(destination,markdown,{flag:'wx'});
console.log(`Imported ${path.basename(destination)}; built ${buildBlog().length} post(s) and RSS feed.`);

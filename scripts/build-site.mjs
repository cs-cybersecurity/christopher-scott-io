import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlog} from './build-blog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const publicFiles = ['index.html', 'styles.css', 'app.js', 'config.js', 'content.js', 'favicon.svg', 'blog.css', 'blog-data.js', 'rss.xml'];

export function buildSite() {
  buildBlog();
  // Only replace this checkout's generated output; refuse linked output directories.
  if (output !== path.resolve(root, 'dist') || !output.startsWith(root + path.sep)) throw Error('Invalid public output path');
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw Error('dist must not be a symbolic link');
  fs.rmSync(output, {recursive:true, force:true});
  fs.mkdirSync(output, {recursive:true});
  for (const file of publicFiles) fs.copyFileSync(path.join(root, file), path.join(output, file));
  fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), {recursive:true, dereference:false});
  fs.writeFileSync(path.join(output, '.nojekyll'), '');
  console.log('Built dist/: public site and RSS only. Editor, drafts, source posts, scripts and dependencies excluded.');
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildSite();

const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = {window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('content.js','utf8'),context);
context.CONTENT=context.window.CONTENT;
vm.runInContext(fs.readFileSync('service-details.js','utf8'),context);
const categories=context.window.CATALOG;
const items=categories.flatMap(category=>category.items);
assert.equal(categories.length,6);
assert.equal(items.length,52);
assert.equal(new Set(items.map(item=>item.id)).size,52);
context.CONTENT.services.forEach((category,i)=>{
  assert.equal(categories[i+1].title,category.title);
  assert.deepEqual(Array.from(categories[i+1].items,item=>item.title),Array.from(category.items,item=>item.title));
});
for(const item of items){
  assert.ok(item.overview.length>100 && /\.$/.test(item.overview));
  assert.ok(!item.overview.includes('…'));
  assert.ok(item.help.length>=3 && item.help.length<=5);
}
console.log('PASS: 48 original titles retained; 4 distinct web offerings; 52 unique routes with complete overview and concrete deliverables.');

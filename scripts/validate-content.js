'use strict';

// Compare the browser data directly against the supplied source files. No packages required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const readLines = name => fs.readFileSync(path.join(root, name), 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), sandbox,
  { filename: 'content.js', timeout: 1000 });
// Copy values out of the VM realm so strict assertions compare plain local objects.
const content = JSON.parse(JSON.stringify(sandbox.window.CONTENT));
assert.ok(content && Array.isArray(content.services) && content.resume, 'Expected window.CONTENT');

// Independently recognize the numbered catalog, category headings, introductions and arrow artifacts.
const serviceLines = readLines('Services.txt');
const sourceCategories = [];
let category;
let expectedNumber = 1;
for (let index = 0; index < serviceLines.length;) {
  const line = serviceLines[index];
  if (/^\d{2}$/.test(line)) {
    assert.ok(category, 'A numbered service must belong to a category');
    assert.equal(Number(line), expectedNumber++, `Unexpected service number in ${category.title}`);
    assert.ok(serviceLines[index + 1] && serviceLines[index + 2], 'Service name and description required');
    category.items.push({ title: serviceLines[index + 1], description: serviceLines[index + 2] });
    index += 3;
    if (serviceLines[index] === '\u2192') index++;
  } else {
    assert.ok(serviceLines[index + 1], 'Category introduction required');
    category = { title: line, intro: serviceLines[index + 1], items: [] };
    sourceCategories.push(category);
    expectedNumber = 1;
    index += 2;
  }
}
assert.deepEqual(content.services.map(({ title, intro, items }) => ({ title, intro, items })),
  sourceCategories, 'Every category, introduction, service name and description must match the source verbatim and in order');
assert.equal(new Set(content.services.map(item => item.id)).size, content.services.length,
  'Service category anchors must be unique');
for (const entry of content.services) assert.match(entry.id, /^[a-z][a-z0-9-]*$/, 'Safe category anchor required');

const linkedIn = readLines('LinkedInInforamtion.txt');
const educationStart = linkedIn.indexOf('Education:');
const certificationsStart = linkedIn.indexOf('Licenses & certifications');
assert.ok(educationStart > 0 && certificationsStart > educationStart,
  'LinkedIn source must contain Experience, Education and Licenses & certifications');
const uiArtifacts = line => line === 'Experience' || line === 'Education:' || line === 'Education'
  || line === 'Licenses & certifications' || line === 'Show credential' || line.endsWith(' logo');
const professionalLines = lines => lines.filter(line => !uiArtifacts(line));

const experienceOutput = content.resume.experience.flatMap(group => [
  ...(group.grouped ? [group.employer, ...group.meta] : []),
  ...group.roles.flatMap(role => [role.title, ...role.meta, ...role.description])
]);
assert.deepEqual(experienceOutput, professionalLines(linkedIn.slice(0, educationStart)),
  'All substantive LinkedIn experience lines, including dates and descriptions, must match in source order');
for (const group of content.resume.experience) {
  assert.ok(group.roles.length > 0, 'Each employer must contain a role');
  if (!group.grouped) {
    assert.ok(group.roles[0].meta.some(line => line.startsWith(group.employer + ' \u00b7 ')),
      'Employer heading must match the original LinkedIn employer line');
  }
}

const educationOutput = content.resume.education.flatMap(item =>
  [item.institution, item.degree, item.date, ...item.description]);
assert.deepEqual(educationOutput,
  professionalLines(linkedIn.slice(educationStart, certificationsStart)),
  'All education names, degrees, dates and descriptions must match the source in order');

const certificationOutput = content.resume.certifications.flatMap(item =>
  [item.name, item.url, item.issuer, item.date, ...(item.credentialId ? [item.credentialId] : [])]);
assert.deepEqual(certificationOutput, professionalLines(linkedIn.slice(certificationsStart)),
  'All certification names, issuers, credential URLs, dates and IDs must match the source in order');
for (const item of content.resume.certifications) {
  assert.equal(new URL(item.url).protocol, 'https:', 'Credentials must use the original HTTPS links');
}

const serviceCount = sourceCategories.reduce((total, item) => total + item.items.length, 0);
const truncated = sourceCategories.flatMap(item => item.items).filter(item => /\u2026$/.test(item.description));
const roleCount = content.resume.experience.reduce((total, item) => total + item.roles.length, 0);
console.log(`PASS: ${serviceCount} services across ${sourceCategories.length} original categories match verbatim.`);
console.log(`PASS: ${roleCount} roles across ${content.resume.experience.length} employer groups, `
  + `${content.resume.education.length} education entries and ${content.resume.certifications.length} certifications match LinkedIn source wording and order.`);
console.log(`SOURCE LIMITATION: ${truncated.length}/${serviceCount} supplied service descriptions end in an ellipsis; no missing text was invented.`);
console.log('SOURCE NOTE: The extra standalone "Present" line in the current role and all supplied dates and durations are preserved.');
console.log('Only LinkedIn section headings, logo labels, blank lines and "Show credential" interface labels are excluded from resume data.');

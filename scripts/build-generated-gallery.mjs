import { readFile, writeFile } from 'node:fs/promises';

const assets = JSON.parse(await readFile('src/lib/assets/generated-catalog.json', 'utf8'));
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const categories = [...new Set(assets.map(a => a.category))].sort();
const labels = { realestate: 'Real estate', pestcontrol: 'Pest control', poolcare: 'Pool care', shoerepair: 'Shoe repair', renewableenergy: 'Renewable energy', martialarts: 'Martial arts', eldercare: 'Elder care', petcare: 'Pet care', hvac: 'HVAC', saas: 'Software' };
const title = (word) => labels[word] || word.charAt(0).toUpperCase() + word.slice(1);
const cards = assets.map(a => `<article data-search="${escape(a.tags.join(' ') + ' ' + a.alt)}" data-category="${escape(a.category)}"><a href="${escape(a.id)}.webp" target="_blank" rel="noopener"><img src="thumbs/${escape(a.id)}.webp" width="400" height="267" alt="${escape(a.alt)}" loading="lazy"><div><small>${escape(title(a.category))} · AI original</small><h2>${escape(title(a.id.replace(a.category + '-', '').replaceAll('-', ' ')))}</h2></div></a></article>`).join('');
const options = '<option value="">All business types</option>' + categories.map(c => `<option value="${escape(c)}">${escape(title(c))}</option>`).join('');
const path = 'public/media/generated/index.html';
let html = await readFile(path, 'utf8');
html = html.replace(/<p>\d+ original generated images[\s\S]*?<\/p>/, `<p>${assets.length} original generated images across ${categories.length} business and lifestyle categories. Browse the collection, then use Originals in the editor’s Assets panel to add one to your page. Click any picture to open the full web-sized image.</p>`)
  .replace(/<select id="category">[\s\S]*?<\/select>/, `<select id="category">${options}</select>`)
  .replace(/<p id="count" role="status">[^<]*<\/p>/, `<p id="count" role="status">${assets.length} images</p>`)
  .replace(/<section id="grid" aria-label="Image library">[\s\S]*?<\/section>/, `<section id="grid" aria-label="Image library">${cards}</section>`);
await writeFile(path, html);
console.log(`Gallery refreshed: ${assets.length} images in ${categories.length} categories.`);

import {createScriptEl} from './create-script-el';
import {createLinkEl} from './create-link-el';
import {BuilderTemplate} from '@app/templates/builder-template';
import {randomString} from '@common/utils/string/random-string';
import {SeoTags, setSeoTags} from '@app/editor/utils/seo-tags';

export function getProductionHtml(
  html: string = '',
  template?: BuilderTemplate | null,
  seoTags?: SeoTags,
): string {
  return (
    '<!DOCTYPE html>' +
    parseHtmlIntoDocument(html, template, seoTags).documentElement.outerHTML
  );
}

function parseHtmlIntoDocument(
  html: string = '',
  template?: BuilderTemplate | null,
  seoTags?: SeoTags,
): Document {
  const doc = new DOMParser().parseFromString(html?.trim(), 'text/html');

  // remove old link/script nodes to frameworks, icons, templates etc.
  INTERNAL_ASSET_IDS.forEach(id => {
    const els = doc.querySelectorAll(id);
    for (let i = 0; i < els.length; i++) {
      els[i].parentElement?.removeChild(els[i]);
    }
  });

  // remove "contenteditable" attribute
  doc
    .querySelectorAll('[contenteditable]')
    .forEach(n => n.removeAttribute('contenteditable'));

  addCustomCssAndJsTags(doc);

  if (
    // if no template config, then include bootstrap
    template?.config?.includeBootstrap !== false &&
    !containsBootstrap(doc)
  ) {
    addBootstrap(doc);
  }

  const fontAwesomeLinks = doc.querySelectorAll(
    `link[href$="font-awesome.min.css"]`,
  );
  fontAwesomeLinks.forEach(link => link.remove());
  addFontawesome(doc);

  if (seoTags) {
    setSeoTags(seoTags, doc);
  }

  return doc;
}

function addBootstrap(document: Document) {
  document.head.appendChild(
    createLinkEl(
      `bootstrap/bootstrap.min.css?${randomString(8)}`,
      'bootstrap-css',
    ),
  );
  document.body.appendChild(
    createScriptEl(`bootstrap/jquery.min.js?${randomString(8)}`, 'jquery'),
  );
  document.body.appendChild(
    createScriptEl(
      `bootstrap/bootstrap.min.js?${randomString(8)}`,
      'bootstrap-js',
    ),
  );
}

function addFontawesome(document: Document) {
  document.head.appendChild(
    createLinkEl(
      `font-awesome/font-awesome.min.css?${randomString(8)}`,
      'font-awesome',
    ),
  );
}

function addCustomCssAndJsTags(document: Document) {
  document.head.appendChild(
    createLinkEl(
      `css/custom_elements.css?${randomString(8)}`,
      'custom-elements-css',
    ),
  );
  document.head.appendChild(
    createLinkEl(`css/code_editor_styles.css?${randomString(8)}`, 'custom-css'),
  );
  document.body.appendChild(
    createScriptEl(`js/code_editor_scripts.js?${randomString(8)}`, 'custom-js'),
  );
}

function containsBootstrap(doc: Document): boolean {
  return !!Array.from(doc.querySelectorAll('link')).find(l =>
    l.href.includes('bootstrap'),
  );
}

const INTERNAL_ASSET_IDS = [
  'base',
  '#jquery',
  '#custom-css',
  '#custom-js',
  '#template-js',
  '[id^=library]',
  '#theme-css',
  '#template-css',
  '#framework-css',
  '#framework-js',
  '#preview-css',
  '#font-awesome',
  '#custom-elements-css',
  '#bootstrap-css',
  '#bootstrap-js',
  '.html2canvas-container',
];

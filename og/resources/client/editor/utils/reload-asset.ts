import {nanoid} from 'nanoid';

export function reloadAsset(selector: string, doc: Document) {
  const link = doc.querySelector(selector) as HTMLLinkElement;
  const oldHref = link.getAttribute('href')?.split('?')[0];
  const newHref = `${oldHref}?=${nanoid(8)}`;
  link.setAttribute('href', newHref);
}

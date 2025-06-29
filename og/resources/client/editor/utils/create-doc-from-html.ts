import {nanoid} from 'nanoid';

export function createDocFromHtml(html: string): Document {
  const dom = new DOMParser().parseFromString(html?.trim(), 'text/html');
  const tw = dom.createTreeWalker(dom.documentElement, NodeFilter.SHOW_ELEMENT);
  let next;
  while ((next = tw.nextNode())) {
    (next as HTMLElement).dataset.arId = nanoid(10);
  }
  return dom;
}

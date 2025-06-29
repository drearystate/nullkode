export interface SeoTags {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
}

export function getSeoTags(doc: Document): SeoTags {
  return {
    title: doc.querySelector('title')?.innerText,
    description: doc
      .querySelector('meta[name="description"]')
      ?.getAttribute('content'),
    keywords: doc
      .querySelector('meta[name="keywords"]')
      ?.getAttribute('content'),
  };
}

export function setSeoTags(tags: SeoTags, doc: Document) {
  setTagValue('title', tags.title, doc);
  setTagValue('description', tags.description, doc);
  setTagValue('keywords', tags.keywords, doc);
}

function setTagValue(
  name: keyof SeoTags,
  value: string | null | undefined,
  doc: Document,
) {
  let node =
    name === 'title'
      ? doc.querySelector('title')
      : doc.querySelector(`meta[name=${name}]`);

  if (!value) {
    if (node) {
      node.remove();
    }
    return;
  }

  if (!node) {
    node = doc.createElement(name === 'title' ? 'title' : 'meta');
    doc.head.appendChild(node);
  }

  if (name === 'title') {
    (node as HTMLElement).innerText = value;
  } else {
    node.setAttribute('name', name);
    node.setAttribute('content', value);
  }
}

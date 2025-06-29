export function getScrollTop(doc: Document): number {
    if (!doc.documentElement) return 0;
    return doc.documentElement.scrollTop || doc.body.scrollTop;
}

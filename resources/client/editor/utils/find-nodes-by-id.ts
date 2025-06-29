export function findNodesById(
    ids: string[],
    doc: Document
): NodeListOf<HTMLElement> {
    const selector = ids
        .map(id => {
            return `[data-ar-id="${id}"]`;
        })
        .join(',');
    return doc.querySelectorAll(selector);
}

export function findNodeById(id: string, doc: Document): HTMLElement {
    return findNodesById([id], doc)[0];
}

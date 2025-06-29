export function createLinkEl(href: string, id?: string): HTMLLinkElement {
    const link = document.createElement('link') as HTMLLinkElement;
    link.rel = 'stylesheet';
    link.href = href;
    if (id) link.id = id;
    return link;
}

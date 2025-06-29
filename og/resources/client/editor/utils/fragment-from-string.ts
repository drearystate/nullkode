export function fragmentFromString(html: string) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
}

export function nodeFromString(html: string): HTMLElement {
    return fragmentFromString(html).firstChild as HTMLElement;
}

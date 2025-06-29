export function hasClass(node: HTMLElement, className: string): boolean {
    if (!node || !node.classList) return false;
    return node.classList.contains(className);
}

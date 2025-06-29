export function createScriptEl(src: string, id?: string): HTMLScriptElement {
    const script = document.createElement('script');
    if (id) {
        script.id = id;
    }
    script.src = src;
    return script;
}

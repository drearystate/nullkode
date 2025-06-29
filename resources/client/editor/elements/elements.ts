import {ArchitectElement} from '@app/editor/elements/architect-element';
import {getBootstrapData} from '@common/core/bootstrap-data/use-backend-bootstrap-data';
import {ELEMENT_DEFAULTS} from '@app/editor/elements/element-defaults';
import {UseTransReturn} from '@common/i18n/use-trans';
import * as ArchitectElements from '@app/editor/elements/definitions/all';
import {message} from '@common/i18n/message';
import {ElementContextData} from '@app/editor/elements/element-context-data';
import {useEditorStore} from '@app/editor/state/editor-store';

export interface MappedElements {
  categories: string[];
  elements: ArchitectElement[];
}

class ElementsHandler {
  protected elementsCache: MappedElements | null = null;

  canInsertElInto(parentNode: HTMLElement, child: ArchitectElement): boolean {
    if (parentNode.nodeName === 'BODY') return true;
    if (parentNode.nodeName === 'HTML') return false;

    const parentEl = this.match(parentNode)?.el;
    if (!parentEl) return false;

    // check by architect element types
    if (parentEl.allowedEls.length) {
      return parentEl.allowedEls.some(el => child instanceof el);
    }

    // check by html content category
    if (parentEl.allowedContent && child.contentCategories) {
      return child.contentCategories.some(t =>
        parentEl.allowedContent.includes(t),
      );
    }

    return false;
  }

  match(node: HTMLElement): ElementContextData | null {
    if (!node?.nodeName || !this.elementsCache) return null;
    for (const el of this.elementsCache.elements) {
      const response = el.matcher?.(node);
      if (!!response) {
        return {el, node: response === true ? node : response};
      }
    }
    return null;
  }

  async load(trans: UseTransReturn['trans']) {
    this.elementsCache = {
      categories: [],
      elements: [],
    };

    const customElements = await fetchCustomElements();

    // first match custom elements, then bootstrap, then base ones
    this.elementsCache.elements = [
      ...Object.values(ArchitectElements).filter(el => el.name),
      ...customElements.filter(el => el.name),
    ]
      .map((el: any) => {
        if (typeof el === 'function') {
          el = new el();
        }
        el.name = trans(message(el.name));
        if (
          el.category &&
          !this.elementsCache!.categories.includes(el.category)
        ) {
          this.elementsCache!.categories.push(el.category);
        }
        return el;
      })
      .sort((a, b) => (a.specificity < b.specificity ? 1 : -1));

    useEditorStore.setState({elementsLoading: false});

    return this.elementsCache;
  }
}

// Custom elements are now integrated directly through the definitions/all.ts file
async function fetchCustomElements(): Promise<ArchitectElement[]> {
  // No longer needed - custom elements are now built-in
  return [];
}

export const Elements = new ElementsHandler();

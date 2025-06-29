import {BaseMutation} from '../base-mutation';
import {message} from '@common/i18n/message';

export type ModifyAttributesValues = {
  id?: string;
  href?: string | null;
  download?: string | null;
  target?: string | null;
  class?: string;
  type?: string;
  placeholder?: string;
  rows?: string;
  src?: string;
  action?: string;
};

export class ModifyAttributes extends BaseMutation {
  displayName = message('Changed element attributes');
  changes: {new: ModifyAttributesValues; old: ModifyAttributesValues} = {
    new: {},
    old: {},
  };
  constructor(
    protected el: HTMLElement,
    newProps: ModifyAttributesValues,
  ) {
    super(el);
    this.changes.new = newProps;
  }

  protected onBeforeExecute() {
    if (this.pageDoc) {
      const el = this.findEl(this.pageDoc);
      if (el) {
        this.changes.old = {};
        Object.keys(this.changes.new).forEach(p => {
          const prop = p as keyof ModifyAttributesValues;
          this.changes.old[prop] = el.getAttribute(prop) ?? undefined;
        });
      }
    }
  }

  protected executeMutation(doc: Document): boolean {
    return this.modifyAttributes(doc, this.changes.new);
  }

  protected undoMutation(doc: Document): boolean {
    return this.modifyAttributes(doc, this.changes.old);
  }

  protected modifyAttributes(doc: Document, props: ModifyAttributesValues) {
    const el = this.findEl(doc);
    if (!el) return false;
    return Object.entries(props)
      .map(([prop, value]) => {
        if (value !== el.getAttribute(prop)) {
          if (value == null) {
            el.removeAttribute(prop);
          } else {
            el.setAttribute(prop, value);
          }
          return true;
        }
      })
      .some(changed => changed);
  }
}

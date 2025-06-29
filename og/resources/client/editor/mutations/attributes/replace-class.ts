import {BaseMutation} from '../base-mutation';
import {message} from '@common/i18n/message';

export class ReplaceClass extends BaseMutation {
  displayName = message('Replaced element class');
  changes: {new: string; old: string} = {new: '', old: ''};
  constructor(
    protected el: HTMLElement,
    newClassName: string,
    oldClassName: string,
  ) {
    super(el);
    this.changes.new = newClassName;
    this.changes.old = oldClassName;
  }

  protected onBeforeExecute() {
    //
  }

  protected executeMutation(doc: Document): boolean {
    return this.replaceClass(doc, this.changes.new, this.changes.old);
  }

  protected undoMutation(doc: Document): boolean {
    return this.replaceClass(doc, this.changes.old, this.changes.new);
  }

  protected replaceClass(doc: Document, newClass: string, oldClass: string) {
    const el = this.findEl(doc);
    if (el && !el.classList.contains(newClass)) {
      if (oldClass) {
        el.classList.remove(oldClass);
      }
      if (newClass) {
        el.classList.add(newClass);
      }
      return !!(oldClass || newClass);
    }
    return false;
  }
}

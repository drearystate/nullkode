import {BaseMutation} from '../base-mutation';
import {ArchitectElement} from '../../elements/architect-element';
import {message} from '@common/i18n/message';

export class SyncElClasses extends BaseMutation {
  displayName = message('Changed element class');
  changes: {new: string[]; old: string[]} = {new: [], old: []};
  constructor(
    protected node: HTMLElement,
    protected el: ArchitectElement,
    classes: string[],
  ) {
    super(node);
    this.changes.new = classes;
  }

  protected onBeforeExecute() {
    this.changes.old = Array.from(this.node.classList);
  }

  protected executeMutation(doc: Document): boolean {
    return this.syncClasses(doc, this.changes.new);
  }

  protected undoMutation(doc: Document): boolean {
    return this.syncClasses(doc, this.changes.old);
  }

  protected syncClasses(doc: Document, classes: string[]) {
    const el = this.findEl(doc);
    if (el && classes.join(' ') !== el.className) {
      el.classList.forEach(className => {
        if (!isInternalClass(className, this.el)) {
          el.classList.remove(className);
        }
      });
      el.classList.add(...classes);
      return true;
    }
    return false;
  }
}

export function isInternalClass(className: string, el: ArchitectElement) {
  // display utility class
  if (className.indexOf('d-') > -1) return true;
  // column utility class
  if (className.indexOf('col-') > -1) return true;
  return (el.hiddenClasses || []).includes(className);
}

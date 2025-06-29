import {BaseMutation} from '../base-mutation';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {fragmentFromString} from '../../utils/fragment-from-string';
import {message} from '@common/i18n/message';

export class RenameNode extends BaseMutation {
  displayName = message('Changed element name');
  changes: {new: string; old: string} = {new: '', old: ''};

  constructor(
    protected el: HTMLElement,
    newName: string,
  ) {
    super(el);
    this.changes.new = newName.toUpperCase();
  }

  canChangeName(el: HTMLElement) {
    return (
      this.changes.new !== this.changes.old &&
      !nodeOrParentEditable(el) &&
      !(el.nodeName === 'BODY' || el.nodeName === 'HTML')
    );
  }

  protected onBeforeExecute() {
    this.changes.old = this.el.nodeName;
  }

  protected executeMutation(doc: Document): boolean {
    return this.changeNodeName(doc, this.changes.new, this.changes.old);
  }

  protected undoMutation(doc: Document): boolean {
    return this.changeNodeName(doc, this.changes.old, this.changes.new);
  }

  protected changeNodeName(
    doc: Document,
    newName: string,
    oldName: string,
  ): boolean {
    const el = this.findEl(doc);
    if (!el || !this.canChangeName(el)) {
      return false;
    }
    let currentHtml = el.outerHTML;
    currentHtml = currentHtml.replace(
      RegExp('(^<' + oldName + ')|(' + oldName + '>$)', 'gi'),
      x => x.toUpperCase().replace(oldName, newName),
    );
    const fragment = fragmentFromString(currentHtml);
    el.replaceWith(fragment);
    return true;
  }
}

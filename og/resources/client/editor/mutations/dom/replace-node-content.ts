import {BaseMutation} from '../base-mutation';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {message} from '@common/i18n/message';

export class ReplaceNodeContent extends BaseMutation {
  displayName = message('Modified element content');
  changes = {new: '', old: ''};

  constructor(
    protected el: HTMLElement,
    oldContent: string,
    newContent: string,
  ) {
    super(el);
    this.changes.new = newContent;
    this.changes.old = oldContent;
  }

  canReplace(el: HTMLElement) {
    return (
      this.changes.old !== this.changes.new &&
      !nodeOrParentEditable(el) &&
      !(el.nodeName === 'BODY' || el.nodeName === 'HTML')
    );
  }

  protected executeMutation(doc: Document): boolean {
    return this.replaceContent(doc, this.changes.new);
  }

  protected undoMutation(doc: Document): boolean {
    return this.replaceContent(doc, this.changes.old);
  }

  protected replaceContent(doc: Document, content: string): boolean {
    const el = this.findEl(doc);
    if (!el || !this.canReplace(el)) {
      return false;
    }
    el.innerHTML = content;
    return true;
  }
}

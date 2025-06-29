import {BaseMutation} from '../base-mutation';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {message} from '@common/i18n/message';
import {nanoid} from 'nanoid';
import {setSelectedContext} from '@app/editor/state/set-selected-context';

export class CloneNode extends BaseMutation {
  displayName = message('Cloned element');
  changes = {new: null, old: null};
  protected cloneId: string;

  constructor(protected el: HTMLElement) {
    super(el);
    this.cloneId = nanoid(10);
  }

  static canClone(el: HTMLElement) {
    return (
      !nodeOrParentEditable(el) &&
      !(el.nodeName === 'BODY' || el.nodeName === 'HTML')
    );
  }

  getCloneId(): string {
    return this.cloneId;
  }

  protected executeMutation(doc: Document): boolean {
    const el = this.findEl(doc);
    if (!el || !CloneNode.canClone(el)) {
      return false;
    }
    const clone = el.cloneNode(true) as HTMLElement;
    clone.dataset.arId = this.cloneId;
    el.after(clone);
    if (doc === this.previewDoc) {
      setSelectedContext(this.cloneId);
    }
    return true;
  }

  protected undoMutation(doc: Document): boolean {
    const cloneEl = this.findEl(doc, this.cloneId);
    if (cloneEl) {
      cloneEl.remove();
      if (doc === this.previewDoc) {
        setSelectedContext(this.getNodeId());
      }
      return true;
    } else {
      return false;
    }
  }
}

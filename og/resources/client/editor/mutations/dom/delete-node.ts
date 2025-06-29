import {BaseMutation} from '../base-mutation';
import {getNodeId} from '../../utils/get-node-id';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {getNodeIndex} from '../../utils/get-node-index';
import {message} from '@common/i18n/message';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {editorState} from '@app/editor/state/editor-store';

export class DeleteNode extends BaseMutation {
  displayName = message('Deleted element');
  changes = {new: null, old: null};
  protected parentId: string | null = null;
  protected nodeIndex: number = 0;
  protected deletedEl!: HTMLElement;

  constructor(protected el: HTMLElement) {
    super(el);
  }

  static canDelete(el: HTMLElement) {
    return (
      el &&
      !nodeOrParentEditable(el) &&
      !(el.nodeName === 'BODY' || el.nodeName === 'HTML')
    );
  }

  protected onBeforeExecute() {
    const el = this.findEl(this.pageDoc!);
    if (el && el.parentElement) {
      this.deletedEl = el.cloneNode(true) as HTMLElement;
      this.parentId = getNodeId(el.parentElement);
      this.nodeIndex = getNodeIndex(el);
    }
  }

  protected executeMutation(doc: Document): boolean {
    const el = this.findEl(doc);
    if (!el || !DeleteNode.canDelete(el)) {
      return false;
    }
    if (
      doc === this.previewDoc &&
      editorState().selectedContext?.nodeId === this.nodeId
    ) {
      setSelectedContext(null);
    }
    el.remove();
    return true;
  }

  protected undoMutation(doc: Document): boolean {
    const parentEl = this.findEl(doc, this.parentId);
    if (parentEl) {
      const i = this.nodeIndex > 0 ? this.nodeIndex - 1 : 0;
      // clone node again, so we are not inserting the same one into both documents
      const newNode = this.deletedEl.cloneNode(true);
      const refNode = parentEl.children.item(i);
      if (refNode) {
        refNode.after(newNode);
      } else {
        parentEl.appendChild(newNode);
      }
      if (doc === this.previewDoc) {
        setSelectedContext(this.nodeId);
      }
      return true;
    }
    return false;
  }
}

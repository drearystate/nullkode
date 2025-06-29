import {getNodeId} from '../utils/get-node-id';
import {findNodeById} from '../utils/find-nodes-by-id';
import {editorState} from '@app/editor/state/editor-store';
import {MessageDescriptor} from '@common/i18n/message-descriptor';
import {nanoid} from 'nanoid';

export abstract class BaseMutation {
  uniqueId: string;
  abstract displayName: MessageDescriptor;

  protected nodeId: string | null;
  protected pageDoc: Document | null;
  protected previewDoc: Document | null;

  protected abstract changes: {new: unknown; old: unknown};

  protected abstract executeMutation(doc: Document): boolean;
  protected abstract undoMutation(doc: Document): boolean;
  protected onBeforeExecute() {
    //
  }

  protected constructor(protected nodeOrId: HTMLElement | string) {
    this.nodeId = typeof nodeOrId === 'string' ? nodeOrId : getNodeId(nodeOrId);
    this.pageDoc = editorState().getActivePageDoc();
    this.previewDoc = editorState().getEditorDoc();
    this.uniqueId = nanoid(10);
  }

  init(): this {
    this.onBeforeExecute();
    return this;
  }

  execute(): boolean {
    if (!this.nodeId || !this.pageDoc || !this.previewDoc) {
      return false;
    }
    return [this.pageDoc, this.previewDoc]
      .map(doc => this.executeMutation(doc))
      .some(executed => executed);
  }

  undo(): boolean {
    if (!this.nodeId || !this.pageDoc || !this.previewDoc) {
      return false;
    }
    return [this.pageDoc, this.previewDoc]
      .map(doc => this.undoMutation(doc))
      .every(executed => executed);
  }

  redo(): boolean {
    if (!this.nodeId || !this.pageDoc || !this.previewDoc) {
      return false;
    }
    return this.execute();
  }

  getNodeId() {
    return this.nodeId;
  }

  getInitialValue() {
    return this.changes.old;
  }

  overrideInitialValue(value: unknown) {
    this.changes.old = value;
  }

  protected findEl(doc: Document, elId?: string | null): HTMLElement | null {
    elId = elId || this.nodeId;
    return elId ? findNodeById(elId, doc) : null;
  }
}

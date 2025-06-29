import {addIdToNode} from '@app/editor/utils/add-id-to-node';

export function createColumnNode(span: number, doc: Document): HTMLElement {
  const col = doc.createElement('div');
  col.className = 'col-sm-' + span;
  addIdToNode(col, true);
  return col;
}

import {getNodeId} from '@app/editor/utils/get-node-id';
import {getColumnSpan} from '@app/editor/editor-sidebar/layout-editor/get-column-span';

export interface RowColumnConfig {
  span: number;
  id: string;
}

export function getRowColumns(row: HTMLElement): RowColumnConfig[] {
  return Array.from(row?.children || [])
    .filter(n => n.className.indexOf('col-') > -1)
    .map(node => ({
      span: getColumnSpan(node as HTMLElement),
      id: getNodeId(node as HTMLElement),
    }))
    .filter(c => c.id) as RowColumnConfig[];
}

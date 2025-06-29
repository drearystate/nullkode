import {
  ColumnEl,
  ContainerEl,
  RowEl,
} from '@app/editor/elements/definitions/grid';
import {
  CONTAINER_CLASS,
  layoutEditorState,
} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {SelectedElementContextData} from '@app/editor/state/editor-store';
import {getRowColumns} from '@app/editor/editor-sidebar/layout-editor/get-row-columns';

export function setSelectedLayoutEditorItems(
  ctx: SelectedElementContextData | null,
) {
  let container: HTMLElement | null = null;
  let containerId: string | null = null;
  let row: HTMLElement | null = null;
  let rowId: string | null = null;
  let column: HTMLElement | null = null;
  let columnId: string | null = null;

  if (!ctx) {
    layoutEditorState().setSelectedContainer(null);
    layoutEditorState().setSelectedRow(null);
    layoutEditorState().setSelectedColumn(null);
    return;
  }

  if (ctx.el instanceof ColumnEl) {
    row = ctx.node.closest('.row');
    container = ctx.node.closest(CONTAINER_CLASS);
    column = ctx.node;
  } else if (ctx.el instanceof RowEl) {
    row = ctx.node;
    container = ctx.node.closest(CONTAINER_CLASS);
  } else if (ctx.el instanceof ContainerEl) {
    container = ctx.node;
  }

  if (container) {
    containerId = getNodeId(container);
  }
  layoutEditorState().setSelectedContainer(containerId);

  if (row) {
    rowId = getNodeId(row);
  }
  if (rowId) {
    layoutEditorState().setSelectedRow({
      id: rowId,
      columns: getRowColumns(row as HTMLElement),
    });
  } else {
    layoutEditorState().setSelectedRow(null);
  }

  if (column) {
    columnId = getNodeId(column);
  }
  layoutEditorState().setSelectedColumn(columnId);
}

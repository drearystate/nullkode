import {create} from 'zustand';
import {getNodeId, getNodeIds} from '@app/editor/utils/get-node-id';
import {editorState} from '@app/editor/state/editor-store';
import {createColumnNode} from '@app/editor/editor-sidebar/layout-editor/create-column-node';
import {InsertNode} from '@app/editor/mutations/dom/insert-node';
import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {getNodeIndex} from '@app/editor/utils/get-node-index';
import {ApplyRowPreset} from '@app/editor/mutations/layout/apply-row-preset';
import {RowColumnConfig} from '@app/editor/editor-sidebar/layout-editor/get-row-columns';
import {mutationState} from '@app/editor/state/mutation-store';

export const CONTAINER_CLASS = '.container, .container-fluid';

interface RowConfig {
  id: string;
  columns: RowColumnConfig[];
}

export interface ContainerConfig {
  id: string;
  rows: string[];
}

interface LayoutEditorState {
  allContainers: ContainerConfig[];
  loadContainers: () => void;
  insertNewContainer: typeof insertNewContainer;
  selectedContainer: string | null;
  setSelectedContainer: (containerId: string | null) => void;
  selectedRow: RowConfig | null;
  setSelectedRow: (row: RowConfig | null) => void;
  selectedColumn: string | null;
  setSelectedColumn: (columnId: string | null) => void;
  insertNewRow: typeof insertNewRow;
  applyRowPreset: typeof applyRowPreset;
}

export const useLayoutEditorStore = create<LayoutEditorState>()((set, get) => {
  return {
    allContainers: [],
    loadContainers() {
      const containers: LayoutEditorState['allContainers'] = [];
      Array.from(
        editorState().getEditorDoc().querySelectorAll(CONTAINER_CLASS),
      ).forEach(node => {
        const rowIds = getNodeIds(node.querySelectorAll(':scope > .row'));
        const nodeId = getNodeId(node as HTMLElement);
        if (nodeId && !containers.find(c => c.id === nodeId)) {
          containers.push({rows: rowIds, id: nodeId});
        }
      });
      set({allContainers: containers});
    },
    insertNewContainer,
    insertNewRow,
    applyRowPreset,
    selectedContainer: null,
    setSelectedContainer(containerId) {
      set({selectedContainer: containerId});
    },
    selectedRow: null,
    setSelectedRow(row) {
      set({selectedRow: row});
    },
    selectedColumn: null,
    setSelectedColumn(columnId) {
      set({selectedColumn: columnId});
    },
  };
});

export function layoutEditorState() {
  return useLayoutEditorStore.getState();
}

function insertNewContainer(
  refId: string | undefined,
  direction: 'before' | 'after',
) {
  const doc = editorState().getEditorDoc();
  const row = createNewRow();
  const container = doc.createElement('div');
  container.classList.add('container');
  container.appendChild(row);
  insertNewLayoutItem(container, refId, direction);
}

function insertNewRow(
  containerId: string,
  refId: string | undefined,
  direction: 'before' | 'after',
) {
  const row = createNewRow();
  insertNewLayoutItem(row, refId, direction, containerId);
}

function createNewRow() {
  const doc = editorState().getEditorDoc();
  const row = doc.createElement('div');
  row.appendChild(createColumnNode(12, doc));
  row.classList.add('row');
  return row;
}

function insertNewLayoutItem(
  item: HTMLElement,
  refId: string | undefined,
  direction: 'before' | 'after',
  parentId?: string | null,
): string | null {
  const doc = editorState().getEditorDoc();
  let refIndex: number = 0;
  if (refId) {
    const refNode = findNodeById(refId, doc);
    const refParent = refNode?.parentElement;
    if (!parentId) {
      parentId = refParent ? getNodeId(refParent) : null;
    }
    refIndex = getNodeIndex(refNode);
  } else {
    if (!parentId) {
      parentId = getNodeId(doc.body);
    }
    refIndex = 0;
  }

  if (!parentId) {
    return null;
  }

  const itemIndex = direction === 'before' ? refIndex : refIndex + 1;
  const mutation = new InsertNode(item, itemIndex, parentId);
  mutationState().executeMutation(mutation, {lastInSession: true});
  return mutation.getNodeId();
}

function applyRowPreset(newPreset: number[]) {
  const selectedRow = layoutEditorState().selectedRow;
  if (!selectedRow) return;

  const currentPreset = selectedRow.columns.map(c => c.span).join('+');

  if (newPreset.join('+') !== currentPreset) {
    mutationState().executeMutation(
      new ApplyRowPreset(selectedRow.id, newPreset),
      {
        lastInSession: true,
      },
    );
  }
}

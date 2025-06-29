import {NewLayoutEditorItemButton} from '@app/editor/editor-sidebar/layout-editor/new-layout-editor-item-button';
import {
  ContainerConfig,
  layoutEditorState,
  useLayoutEditorStore,
} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';
import {Trans} from '@common/i18n/trans';
import React, {Fragment, useRef, useState} from 'react';
import clsx from 'clsx';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {setHoveredContext} from '@app/editor/state/set-hovered-context';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {LayoutEditorColumnPresets} from '@app/editor/editor-sidebar/layout-editor/layout-editor-column-presets';
import {LayoutEditorColumnList} from '@app/editor/editor-sidebar/layout-editor/layout-editor-column-list';
import {useSortable} from '@common/ui/interactions/dnd/sortable/use-sortable';
import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {editorState} from '@app/editor/state/editor-store';
import {MoveNode} from '@app/editor/mutations/dom/move-node';
import {setSelectedLayoutEditorItems} from '@app/editor/editor-sidebar/layout-editor/set-selected-layout-editor-items';
import {LayoutItemActions} from '@app/editor/editor-sidebar/layout-editor/layout-item-actions';
import {mutationState} from '@app/editor/state/mutation-store';

interface Props {
  container: ContainerConfig;
}
export function LayoutEditorRowList({container}: Props) {
  const selectedRow = useLayoutEditorStore(s => s.selectedRow);
  return (
    <div>
      <NewLayoutEditorItemButton
        textClassName="text-muted group-hover:text-primary"
        onClick={() => {
          layoutEditorState().insertNewRow(
            container.id,
            container.rows[0],
            'before',
          );
        }}
      >
        <Trans message="+ Add row" />
      </NewLayoutEditorItemButton>
      {container.rows.map((rowId, index) => (
        <RowListItem
          container={container}
          rows={container.rows}
          key={rowId}
          rowId={rowId}
          index={index}
        />
      ))}
      {selectedRow && (
        <Fragment>
          <LayoutEditorColumnPresets />
          <LayoutEditorColumnList />
        </Fragment>
      )}
    </div>
  );
}

interface RowListItemProps {
  rowId: string;
  rows: string[];
  index: number;
  container: ContainerConfig;
}
function RowListItem({container, rows, rowId, index}: RowListItemProps) {
  const selectedRow = useLayoutEditorStore(s => s.selectedRow);
  const ref = useRef<HTMLDivElement>(null);
  const [isSorting, setIsSorting] = useState(false);

  const {sortableProps, dragHandleRef} = useSortable({
    type: 'rowListSort',
    item: rowId,
    items: rows,
    ref,
    strategy: 'liveSort',
    onSortStart: () => {
      setIsSorting(true);
    },
    onSortEnd: (oldIndex, newIndex) => {
      const rowNode = findNodeById(rowId, editorState().getEditorDoc());
      if (rowNode) {
        mutationState().executeMutation(
          new MoveNode({
            el: rowNode,
            oldIndex,
            oldParentId: container.id,
            newIndex,
            newParentId: container.id,
            onMutate: () => {
              // put new column config into layout editor store on execute and undo/redo
              setSelectedLayoutEditorItems(editorState().selectedContext);
            },
          }),
          {lastInSession: true},
        );
      }
      setIsSorting(false);
    },
  });

  return (
    <Fragment>
      <div
        {...sortableProps}
        ref={ref}
        onMouseEnter={() => setHoveredContext(rowId)}
        onMouseLeave={() => HoveredElementOverlay.remove()}
        className={clsx(
          'flex items-center rounded-button border',
          selectedRow?.id === rowId && !isSorting && 'border-primary',
        )}
      >
        <button
          ref={dragHandleRef}
          className="mr-auto block h-36 flex-auto cursor-move pl-10 text-left text-xs hover:bg-hover"
          onClick={() => setSelectedContext(rowId)}
        >
          <Trans message="Row :number" values={{number: index + 1}} />
        </button>
        <LayoutItemActions
          nodeId={rowId}
          onAfterDelete={() => {
            setSelectedContext(container.id);
          }}
        />
      </div>
      <NewLayoutEditorItemButton
        textClassName="text-primary invisible group-hover:visible"
        onClick={() => {
          layoutEditorState().insertNewRow(container.id, rowId, 'after');
        }}
      >
        <Trans message="+ Add row" />
      </NewLayoutEditorItemButton>
    </Fragment>
  );
}

import {useLayoutEditorStore} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';
import clsx from 'clsx';
import {useRef, useState} from 'react';
import {useSortable} from '@common/ui/interactions/dnd/sortable/use-sortable';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {MoveNode} from '@app/editor/mutations/dom/move-node';
import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {setSelectedLayoutEditorItems} from '@app/editor/editor-sidebar/layout-editor/set-selected-layout-editor-items';
import {setHoveredContext} from '@app/editor/state/set-hovered-context';
import {RowColumnConfig} from '@app/editor/editor-sidebar/layout-editor/get-row-columns';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {mutationState} from '@app/editor/state/mutation-store';

export function LayoutEditorColumnList() {
  const row = useLayoutEditorStore(s => s.selectedRow);
  if (!row) return;

  return (
    <div className="relative mt-14 flex gap-x-2 overflow-hidden rounded-sm">
      {row.columns.map(column => (
        <ListItem
          key={column.id}
          column={column}
          columns={row.columns}
          onSortEnd={(oldIndex, newIndex) => {
            const columnNode = findNodeById(
              column.id,
              editorState().getEditorDoc(),
            );
            if (columnNode) {
              mutationState().executeMutation(
                new MoveNode({
                  el: columnNode,
                  oldIndex,
                  oldParentId: row!.id,
                  newIndex,
                  newParentId: row!.id,
                  onMutate: () => {
                    // put new column config into layout editor store on execute and undo/redo
                    setSelectedLayoutEditorItems(editorState().selectedContext);
                  },
                }),
                {lastInSession: true},
              );
            }
          }}
        />
      ))}
    </div>
  );
}

interface ListItemProps {
  className?: string;
  column: RowColumnConfig;
  columns: RowColumnConfig[];
  onSortEnd: (oldIndex: number, newIndex: number) => void;
}
function ListItem({className, column, columns, onSortEnd}: ListItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const isSelected = useEditorStore(
    s => s.selectedContext?.nodeId === column.id,
  );
  const ref = useRef<HTMLElement>(null);
  const {sortableProps} = useSortable({
    ref,
    item: column,
    items: columns,
    type: 'layoutEditorColumnList',
    strategy: 'moveNode',
    onSortEnd,
    onSortStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
  });
  return (
    <span
      {...sortableProps}
      onClick={() => {
        setSelectedContext(column.id);
      }}
      onMouseEnter={() => {
        setHoveredContext(column.id);
      }}
      onMouseLeave={() => {
        HoveredElementOverlay.remove();
      }}
      ref={ref}
      style={{flex: column.span}}
      className={clsx(
        'flex h-40 cursor-ew-resize items-center justify-center border text-xs transition-colors hover:bg-hover',
        className,
        isSelected && !isDragging && 'border-primary',
        isDragging && 'opacity-30',
      )}
    >
      {column.span}
    </span>
  );
}

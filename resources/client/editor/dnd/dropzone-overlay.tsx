import {useDroppable} from '@common/ui/interactions/dnd/use-droppable';
import {useRef} from 'react';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';

export function DropzoneOverlay() {
  const isDragging = useEditorStore(s => s.dragState !== false);
  const ref = useRef<HTMLDivElement>(null);
  const {droppableProps} = useDroppable({
    id: 'drag-overlay',
    types: ['element-panel'],
    ref,
    onDragEnter: () => {
      editorState().setDragState('dragging');
    },
    onDragLeave: () => {
      // hide drop placeholder when cursor is dragged outside the browser window
      editorState().setDragState('outOfBounds');
    },
  });
  return (
    <div
      className="dropzone-overlay absolute inset-0 m-auto"
      inert={!isDragging ? '' : undefined}
      ref={ref}
      {...droppableProps}
    />
  );
}

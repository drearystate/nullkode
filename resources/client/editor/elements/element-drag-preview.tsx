import React from 'react';
import {DragPreviewRenderer} from '@common/ui/interactions/dnd/use-draggable';
import {DragPreview} from '@common/ui/interactions/dnd/drag-preview';
import {ArchitectElement} from '@app/editor/elements/architect-element';

interface RowDragPreviewProps {
  element: ArchitectElement;
}
export const ElementDragPreview = React.forwardRef<
  DragPreviewRenderer,
  RowDragPreviewProps
>(({element}, ref) => {
  return (
    <DragPreview ref={ref}>
      {() => (
        <div className="rounded bg-chip px-10 py-6 text-sm font-semibold capitalize shadow">
          {element?.name}
        </div>
      )}
    </DragPreview>
  );
});

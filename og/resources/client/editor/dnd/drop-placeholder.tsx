import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {useDragMonitor} from '@common/ui/interactions/dnd/use-drag-monitor';
import {useRef} from 'react';
import {
  DragSessionData,
  getDropPlaceholderPosition,
} from '@app/editor/dnd/get-drop-placeholder-position';
import clsx from 'clsx';
import {InsertNode} from '@app/editor/mutations/dom/insert-node';
import {nodeFromString} from '@app/editor/utils/fragment-from-string';
import {hideElementOverlays} from '@app/editor/elements/element-overlays/element-overlays';
import {ElementContextData} from '@app/editor/elements/element-context-data';
import {MoveNode} from '@app/editor/mutations/dom/move-node';
import {getNodeIndex} from '@app/editor/utils/get-node-index';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {useSaveEditorProject} from '@app/editor/use-save-editor-project';
import {reloadAsset} from '@app/editor/utils/reload-asset';
import {nanoid} from 'nanoid';
import {EditorDragScroller} from '@app/editor/dnd/editor-drag-scroller';
import {mutationState} from '@app/editor/state/mutation-store';

let dragSession: Partial<DragSessionData> | null = null;

interface DragElementContextData {
  node?: HTMLElement;
  el: ElementContextData['el'];
}

export function DropPlaceholder() {
  const ref = useRef<HTMLDivElement>(null!);
  const dragState = useEditorStore(s => s.dragState);
  const saveProject = useSaveEditorProject();

  const syncCustomElementCss = (css: string) => {
    const doc = editorState().getEditorDoc()!;
    const tempId = nanoid(8);
    const style = doc.createElement('style');
    style.id = tempId;
    style.textContent = css;
    doc.head.appendChild(style);

    saveProject.mutate(
      {
        custom_element_css: css,
      },
      {
        onSuccess: () => {
          reloadAsset('#custom-elements-css', doc);
          requestAnimationFrame(() => style.remove());
        },
      },
    );
  };

  useDragMonitor({
    type: 'element-panel',
    onDragStart: (e, dragTarget) => {
      EditorDragScroller.start();
      const data = dragTarget.getData() as DragElementContextData;
      hideElementOverlays();
      if (data.node) {
        data.node.style.opacity = '0.5';
      }
      dragSession = {};
      if (data.node && data.node.parentElement) {
        dragSession.oldIndex = getNodeIndex(data.node);
        dragSession.oldParent = getNodeId(data.node.parentElement);
      }
    },
    onDragMove: (e, target) => {
      const data = target.getData() as DragElementContextData;
      // if we're not dragging over live preview yet, bail
      if (
        e.x <= editorState().iframeRect.left ||
        e.y <= editorState().iframeRect.top ||
        e.x >= editorState().iframeRect.width + editorState().iframeRect.left ||
        e.y >= editorState().iframeRect.height + editorState().iframeRect.top
      ) {
        return;
      }

      EditorDragScroller.scroll(e.y);

      const pos = {
        x: e.x - editorState().iframeRect.left,
        y: e.y - editorState().iframeRect.top,
      };

      const nodeUnderCursor = editorState()
        .getEditorDoc()
        .elementFromPoint(pos.x, pos.y) as HTMLElement;

      dragSession = {
        ...dragSession,
        ...getDropPlaceholderPosition(nodeUnderCursor, data, pos),
      };

      ref.current.style.top = `${dragSession.top}px`;
      ref.current.style.left = `${dragSession.left}px`;
      ref.current.style.width = `${dragSession.width}px`;
      applyArrowClass(ref.current, dragSession.arrow);
    },
    onDragEnd: (e, target, status) => {
      EditorDragScroller.stop();
      const data = target.getData() as DragElementContextData;
      if (data.node) {
        data.node.style.opacity = '';
      }
      if (status === 'dropSuccess') {
        if (
          dragSession != null &&
          data.el.html != null &&
          dragSession.newIndex != null &&
          dragSession.newParent != null
        ) {
          if (data.el.css) {
            syncCustomElementCss(data.el.css);
          }

          const mutation =
            data.node &&
            dragSession.oldIndex != null &&
            dragSession.oldParent != null
              ? new MoveNode({
                  el: data.node,
                  oldIndex: dragSession.oldIndex,
                  oldParentId: dragSession.oldParent,
                  newIndex: dragSession.newIndex,
                  newParentId: dragSession.newParent,
                })
              : new InsertNode(
                  data.node ?? nodeFromString(data.el.html),
                  dragSession.newIndex,
                  dragSession.newParent,
                );

          mutationState().executeMutation(mutation, {lastInSession: true});

          if (data.node) {
            setSelectedContext(data.node);
          }
        }
      }
      dragSession = null;
    },
  });

  return (
    <div
      className={clsx(
        'drop-placeholder pointer-events-none absolute z-20 h-3 select-none bg-primary',
        (!dragState || dragState === 'outOfBounds') && 'hidden',
      )}
      ref={ref}
    />
  );
}

function applyArrowClass(el: HTMLElement, arrow?: DragSessionData['arrow']) {
  if (arrow === 'top') {
    el.classList.remove('arrow-bottom');
    el.classList.add('arrow-top');
  } else if (arrow === 'bottom') {
    el.classList.remove('arrow-top');
    el.classList.add('arrow-bottom');
  } else if (arrow === 'both') {
    el.classList.add('arrow-top');
    el.classList.add('arrow-bottom');
  } else {
    el.classList.remove('arrow-top');
    el.classList.remove('arrow-bottom');
  }
}

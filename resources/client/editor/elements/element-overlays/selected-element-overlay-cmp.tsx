import {ElementOverlayLayout} from '@app/editor/elements/element-overlays/element-overlay-layout';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {useEffect, useRef} from 'react';
import {SelectedElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {useContentEditableStore} from '@app/editor/state/content-editable-store';
import clsx from 'clsx';

export function SelectedElementOverlayCmp() {
  const overlayRef = useRef<HTMLDivElement>(null!);
  const isVisible = useEditorStore(s => !!s.selectedContext?.isVisible);
  const isEditingContent = useContentEditableStore(s => s.sessionIsActive);
  const selectedElementId = useEditorStore(s => s.selectedContext?.nodeId);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (overlayRef.current) {
      SelectedElementOverlay.overlayNode = overlayRef.current;
    }
  }, []);

  useEffect(() => {
    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(([entry]) => {
        overlayRef.current.style.width = `${entry.contentRect.width}px`;
        overlayRef.current.style.height = `${entry.contentRect.height}px`;
      });
    }
    if (selectedElementId && isEditingContent) {
      const node = editorState().selectedContext?.node;
      if (node) {
        resizeObserverRef.current.observe(node);
      }
    }
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [selectedElementId, isEditingContent]);

  return (
    <ElementOverlayLayout
      className={clsx(
        isEditingContent ? 'after:outline-black' : 'after:outline-primary',
        isEditingContent ? 'after:outline-2' : 'after:outline-1',
      )}
      overlayRef={overlayRef}
      isVisible={isVisible}
    />
  );
}

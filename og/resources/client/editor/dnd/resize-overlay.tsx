import {useEditorStore} from '@app/editor/state/editor-store';

export function ResizeOverlay() {
  const isResizing = useEditorStore(s => s.isResizing);
  return (
    <div
      className="resize-overlay absolute inset-0 m-auto"
      inert={!isResizing ? '' : undefined}
    />
  );
}

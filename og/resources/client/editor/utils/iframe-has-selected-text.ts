import {editorState} from '@app/editor/state/editor-store';

export function IframeHasSelectedText(
  parentNode?: HTMLElement | null,
): boolean {
  const selection = editorState().getEditorDoc()?.getSelection();

  if (selection == null || selection.isCollapsed) {
    return false;
  }

  if (parentNode) {
    return parentNode.contains(selection.anchorNode);
  }

  return true;
}

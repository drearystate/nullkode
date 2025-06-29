import {editorState} from '@app/editor/state/editor-store';
import {getScrollTop} from '@app/editor/utils/get-scroll-top';
import {Elements} from '@app/editor/elements/elements';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {contentEditableStore} from '@app/editor/state/content-editable-store';

export function setHoveredContext(eventOrNodeId: MouseEvent | string) {
  if (editorState().dragState || editorState().isResizing) {
    return;
  }

  const node: HTMLElement =
    typeof eventOrNodeId === 'object'
      ? getNodeFromCoords(eventOrNodeId.pageX, eventOrNodeId.pageY)
      : findNodeById(eventOrNodeId, editorState().getEditorDoc());

  const isContentEditable =
    contentEditableStore().sessionIsActive &&
    editorState().selectedContext?.nodeId === getNodeId(node);

  const currentCtx = editorState().hoveredContext;

  // bail if node matches and overlay is visible to avoid
  // unnecessary calculations as this will be called on mousemove
  if (currentCtx?.isVisible && currentCtx?.node === node) {
    return;
  }

  const match = Elements.match(node);
  if (match) {
    editorState().setHoveredContext({
      ...match,
      isVisible: !isContentEditable,
      nodeId: getNodeId(node),
    });
    HoveredElementOverlay.reposition(match);
  }
}

function getNodeFromCoords(x: number, y: number) {
  return editorState()
    .getEditorDoc()
    .elementFromPoint(
      x,
      y - getScrollTop(editorState().getEditorDoc()),
    ) as HTMLElement;
}

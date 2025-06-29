import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {
  editorState,
  SelectedElementContextData,
} from '@app/editor/state/editor-store';
import {Elements} from '@app/editor/elements/elements';
import {SelectedElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import type {ArchitectElement} from '@app/editor/elements/architect-element';
import {flushSync} from 'react-dom';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {inspectorState} from '@app/editor/state/inspector-store';
import {SidebarPanel} from '@app/editor/editor-sidebar/sidebar-panel';
import {setSelectedLayoutEditorItems} from '@app/editor/editor-sidebar/layout-editor/set-selected-layout-editor-items';

interface Options {
  force?: boolean;
}

export function setSelectedContext(
  node: HTMLElement | string | null,
  options?: Options,
): SelectedElementContextData | undefined | null {
  if (node == null) {
    editorState().setSelectedContext(null);
    setSelectedLayoutEditorItems(null);
    return editorState().selectedContext;
  }

  if (typeof node === 'string') {
    node = findNodeById(node, editorState().getEditorDoc());
  }

  const currentCtx = editorState().selectedContext;

  if (
    node?.nodeType !== Node.ELEMENT_NODE ||
    (!options?.force && currentCtx?.node === node)
  ) {
    return editorState().selectedContext;
  }

  const match = Elements.match(node);
  if (!match) return;

  const context: SelectedElementContextData = {
    path: [],
    el: match.el,
    node: match.node,
    isVisible: true,
    nodeId: getNodeId(match.node),
  };

  inspectorState().setInitialConfig(match);

  // create an array from all parents of this node
  let parentNode: HTMLElement | null = context.node;
  while (
    parentNode?.nodeType === Node.ELEMENT_NODE &&
    parentNode.nodeName.toLowerCase() !== 'body'
  ) {
    context.path.unshift({
      nodeId: getNodeId(parentNode),
      name: getPathItemDisplayName(Elements.match(parentNode)?.el, parentNode),
    });
    parentNode = parentNode.parentElement;
  }

  setSelectedLayoutEditorItems(context);

  flushSync(() => {
    editorState().setSelectedContext(context);
  });
  SelectedElementOverlay.reposition();
  editorState().setActivePanel(
    context.el.defaultSidebarPanel ?? SidebarPanel.STYLE,
  );
  return editorState().selectedContext;
}

function getPathItemDisplayName(
  el: ArchitectElement | undefined,
  node: HTMLElement,
): string {
  if (!el) return 'Unknown';

  if (el.name === 'div container') {
    if (node.id) {
      return node.id;
    } else if (node.classList[0]) {
      return node.classList[0];
    } else {
      return el.name;
    }
  } else {
    return el.name;
  }
}

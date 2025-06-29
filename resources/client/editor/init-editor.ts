import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {setHoveredContext} from '@app/editor/state/set-hovered-context';
import {nodeOrParentEditable} from '@app/editor/utils/node-or-parent-editable';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {
  HoveredElementOverlay,
  SelectedElementOverlay,
} from '@app/editor/elements/element-overlays/element-overlays';
import {getBootstrapData} from '@common/core/bootstrap-data/use-backend-bootstrap-data';
import {createLinkEl} from '@app/editor/utils/create-link-el';
import {contentEditableStore} from '@app/editor/state/content-editable-store';
import {IframeHasSelectedText} from '@app/editor/utils/iframe-has-selected-text';
import lazyLoader from '@common/utils/http/lazy-loader';
import {layoutEditorState} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';
import {isAnyInputFocused} from '@common/utils/dom/is-any-input-focused';

export function initEditor() {
  const doc = editorState().getEditorDoc();
  if (!doc) return;

  // Set up event listeners
  doc.addEventListener('mousemove', e => {
    if (isAnyInputFocused() || contentEditableStore().sessionIsActive) {
      return;
    }

    const target = e.target as HTMLElement;
    const selectedNode = editorState().selectedContext?.node;
    if (!selectedNode || !selectedNode.contains(target)) {
      setHoveredContext(e);
    }
  });

  doc.addEventListener('click', e => {
    if (!nodeOrParentEditable(e.target as HTMLElement)) {
      e.preventDefault();
      e.stopPropagation();
      if (!contentEditableStore().sessionIsActive) {
        setSelectedContext(e.target as HTMLElement);
      }
    }
  });

  doc.addEventListener('contextmenu', e => {
    e.preventDefault();
  });

  doc.addEventListener('scroll', () => {
    if (editorState().selectedContext?.node) {
      SelectedElementOverlay.reposition();
    }
    HoveredElementOverlay.reposition();
  });

  // Detect when text is selected in iframe
  doc.addEventListener('selectionchange', () => {
    IframeHasSelectedText();
  });

  useEditorStore.setState({iframeLoading: false});

  doc.addEventListener('mouseleave', () => HoveredElementOverlay.hide());
} 
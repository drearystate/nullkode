import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {setHoveredContext} from '@app/editor/state/set-hovered-context';
import {nodeOrParentEditable} from '@app/editor/utils/node-or-parent-editable';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
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
import {isCtrlKeyPressed} from '@common/utils/keybinds/is-ctrl-key-pressed';
import {contextMenuActions} from '@app/editor/editor-context-menu';
import {executePrimaryContextAction} from '@app/editor/elements/execute-primary-context-action';

export async function initEditor() {
  const doc = editorState().getEditorDoc();
  if (!doc) return;

  doc.documentElement.scrollTop = 0;
  addIframeCss();
  loadFontawesomeIntoMainDocument();

  // wait until all css stylesheets are loaded
  await Promise.all(
    [...doc.head.querySelectorAll('link')]
      .filter(link => link.href.endsWith('.css') && !link.sheet)
      .map(link => new Promise(r => link.addEventListener('load', r))),
  );

  useEditorStore.setState({iframeLoading: false});

  doc.addEventListener('mouseleave', () => HoveredElementOverlay.hide());
  doc.addEventListener('mousemove', setHoveredContext);
  doc.addEventListener('click', handleClick);
  doc.addEventListener('dblclick', () => {
    executePrimaryContextAction(editorState().selectedContext);
  });
  doc.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (
      editorState().dragState ||
      editorState().isResizing ||
      contentEditableStore().sessionIsActive
    ) {
      return;
    }
    const ctx = setSelectedContext(e.target as HTMLElement);
    if (ctx?.el.contextMenu) {
      editorState().setContextMenuPosition({
        x: e.clientX + editorState().iframeRect.left,
        y: e.clientY + editorState().iframeRect.top,
      });
    } else {
      editorState().setContextMenuPosition(null);
    }
  });
  doc.addEventListener('keydown', keybindListener);
  bindToSelectionEnd();
  bindToIframeResize();

  doc.addEventListener('scroll', e => handleScroll(), true);

  layoutEditorState().loadContainers();
}

function keybindListener(e: KeyboardEvent) {
  if (isAnyInputFocused() || isAnyInputFocused(editorState().getEditorDoc())) {
    return;
  }

  if (isCtrlKeyPressed(e) && e.shiftKey && e.key === 'x') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.cut();
  } else if (isCtrlKeyPressed(e) && e.shiftKey && e.key === 'c') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.copy();
  } else if (isCtrlKeyPressed(e) && e.shiftKey && e.key === 'v') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.paste();
  } else if (e.key === 'Delete') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.delete();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.moveUp();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.moveDown();
  } else if (isCtrlKeyPressed(e) && e.key === 'z') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.undo();
  } else if (isCtrlKeyPressed(e) && e.key === 'y') {
    e.preventDefault();
    e.stopPropagation();
    contextMenuActions.redo();
  }
}

function bindToIframeResize() {
  const resizeObserver = new ResizeObserver(() => {
    HoveredElementOverlay.remove();
    SelectedElementOverlay.reposition();
  });
  resizeObserver.observe(editorState().getIframe()!);
}

function bindToSelectionEnd() {
  const doc = editorState().getEditorDoc();
  const toggleToolbar = () => {
    const isVisible = IframeHasSelectedText();
    if (isVisible) {
      contentEditableStore().repositionToolbar?.();
    }

    contentEditableStore().setHasInlineSelection(isVisible);
  };
  // if text is selected via keyboard (e.g., ctrl+a), instantly show the toolbar
  let mouseIsDown = false;
  doc.addEventListener('selectionchange', () => {
    if (mouseIsDown || !contentEditableStore().sessionIsActive) return;
    toggleToolbar();
  });

  // if text is selected via mouse, hide toolbar on mouse down and show it again in new position on mouse up
  doc.addEventListener('mousedown', e => {
    const ctxNode = editorState().selectedContext?.node;

    // check if session is active and if the clicked inside the content editable node
    if (
      !contentEditableStore().sessionIsActive ||
      !ctxNode ||
      !(e.target === ctxNode || ctxNode.contains(e.target as HTMLElement))
    ) {
      return;
    }

    mouseIsDown = true;
    contentEditableStore().setHasInlineSelection(false);
    doc.addEventListener(
      'mouseup',
      () => {
        mouseIsDown = false;
        toggleToolbar();
      },
      {once: true},
    );
  });
}

function handleClick(e: MouseEvent) {
  const node = e.target as HTMLElement;

  const isLink = node.closest('a');
  const isSubmit = node.closest(
    'input[type=submit], button[type=submit], button[type=submit] *',
  );

  // block links and form submits
  if (isLink || isSubmit) {
    e.preventDefault();
    e.stopPropagation();
  }

  editorState().setContextMenuPosition(null);
  editorState().getEditorDoc().body.focus();

  // node is already selected, bail
  if (!node || editorState().selectedContext?.node === node) {
    return;
  }

  // node text is being edited, bail
  if (nodeOrParentEditable(node as HTMLElement)) return;

  setSelectedContext(node);
}

function handleScroll() {
  //removing overlay when dragging will cause dnd to crash, because that will unload react hooks for dnd
  if (!editorState().dragState && !editorState().isResizing) {
    HoveredElementOverlay.remove();
  }
  if (editorState().selectedContext) {
    SelectedElementOverlay.reposition();
  }
  editorState().setContextMenuPosition(null);
}

function loadFontawesomeIntoMainDocument() {
  const doc = editorState().getEditorDoc();

  for (const sheet in doc.styleSheets) {
    const href = doc.styleSheets[sheet].href;
    if (href?.includes('font-awesome')) {
      lazyLoader.loadAsset(href, {type: 'css'});
    }
  }
}

function addIframeCss() {
  const doc = editorState().getEditorDoc();
  if (!doc || doc.head.querySelector('#preview-css')) return;
  const url = `${getBootstrapData().settings.base_url}/builder/css/iframe.css`;
  const link = createLinkEl(url, 'preview-css');
  doc.head.appendChild(link);
}

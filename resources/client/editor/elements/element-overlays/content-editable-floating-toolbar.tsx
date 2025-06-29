import {IconButton} from '@common/ui/buttons/icon-button';
import {FormatBoldIcon} from '@common/icons/material/FormatBold';
import {FormatItalicIcon} from '@common/icons/material/FormatItalic';
import {FormatUnderlinedIcon} from '@common/icons/material/FormatUnderlined';
import {useCallback, useEffect} from 'react';
import clsx from 'clsx';
import {
  contentEditableStore,
  useContentEditableStore,
} from '@app/editor/state/content-editable-store';
import {LinkIcon} from '@common/icons/material/Link';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  useFloating,
  VirtualElement,
} from '@floating-ui/react-dom';
import type {ClientRectObject} from '@floating-ui/core';
import {LinkEditorValue} from '@app/editor/link-editor-dialog/link-editor-value';
import {openLinkEditor} from '@app/editor/link-editor-dialog/open-link-editor';
import {openDialog} from '@common/ui/overlays/store/dialog-store';
import {IconSelectorDialog} from '@app/editor/icon-selector/icon-selector-dialog';
import {EmojiEmotionsIcon} from '@common/icons/material/EmojiEmotions';

const adjustRectForSidebar = (domRect: DOMRect) => {
  const rect: ClientRectObject = {
    x: domRect.x,
    y: domRect.y,
    top: domRect.top,
    left: domRect.left,
    bottom: domRect.bottom,
    right: domRect.right,
    width: domRect.width,
    height: domRect.height,
  };
  rect.left += editorState().iframeRect.left;
  rect.top += editorState().iframeRect.top;
  return rect;
};

function getCurrentSelectionLinkValue(): LinkEditorValue | null {
  const selection = editorState().getEditorWindow().getSelection();
  if (
    selection?.anchorNode &&
    selection.anchorNode.parentNode?.nodeName === 'A'
  ) {
    const link = selection.anchorNode.parentNode as HTMLLinkElement;
    if (link) {
      return {
        href: link.getAttribute('href'),
        target: link.getAttribute('target'),
        download: link.getAttribute('download'),
      };
    }
  }
  return null;
}

export function ContentEditableFloatingToolbar() {
  const isVisible = useContentEditableStore(s => s.hasInlineSelection);
  const activeCommands = useContentEditableStore(s => s.activeCommands);
  const iframeLoading = useEditorStore(s => s.iframeLoading);

  const {refs, floatingStyles, update, middlewareData} =
    useFloating<VirtualElement>({
      placement: 'top',
      middleware: [
        offset(6),
        flip({
          mainAxis: true,
          crossAxis: false,
        }),
        shift({
          mainAxis: true,
          crossAxis: true,
        }),
        hide(),
      ],
      whileElementsMounted: autoUpdate,
    });

  const repositionToolbar = useCallback(() => {
    const selection = editorState().getEditorDoc()?.getSelection();
    const range = selection?.getRangeAt(0);
    if (range) {
      const virtualEl = {
        getBoundingClientRect: () =>
          adjustRectForSidebar(range.getBoundingClientRect()),
        getClientRects: () =>
          [...range.getClientRects()].map(adjustRectForSidebar),
      };
      refs.setReference(virtualEl);
    }
  }, [refs]);

  useEffect(() => {
    contentEditableStore().setRepositionToolbar(repositionToolbar);
  }, [repositionToolbar]);

  // useFloating does not update toolbar position on iframe scroll, so we need to do it manually
  useEffect(() => {
    if (!iframeLoading) {
      const listener = () => update();
      editorState()
        .getEditorDoc()
        ?.addEventListener('scroll', listener, {passive: true});
    }
    return () => {
      editorState().getEditorDoc()?.removeEventListener('scroll', update);
    };
  }, [update, iframeLoading]);

  return (
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible',
      }}
      className={clsx(
        'content-editable-toolbar absolute flex items-center gap-4 rounded-panel border bg',
        !isVisible ? 'pointer-events-none invisible -z-20' : 'z-20',
      )}
    >
      <div className="flex items-center">
        <IconButton
          size="sm"
          onClick={() => contentEditableStore().execCommand('bold')}
          color={activeCommands.includes('bold') ? 'primary' : undefined}
        >
          <FormatBoldIcon />
        </IconButton>
        <IconButton
          size="sm"
          onClick={() => contentEditableStore().execCommand('underline')}
          value="underline"
          color={activeCommands.includes('underline') ? 'primary' : undefined}
        >
          <FormatUnderlinedIcon />
        </IconButton>
        <IconButton
          size="sm"
          value="italic"
          onClick={() => contentEditableStore().execCommand('italic')}
          color={activeCommands.includes('italic') ? 'primary' : undefined}
        >
          <FormatItalicIcon />
        </IconButton>
        <IconButton
          size="sm"
          color={activeCommands.includes('createLink') ? 'primary' : undefined}
          onClick={async () => {
            const value = await openLinkEditor(getCurrentSelectionLinkValue());
            if (value === 'unlink') {
              contentEditableStore().execCommand('unlink');
            } else if (value) {
              contentEditableStore().execCommand('createLink', value);
            }
          }}
          value="createLink"
        >
          <LinkIcon />
        </IconButton>
        <IconButton
          size="sm"
          color={activeCommands.includes('createLink') ? 'primary' : undefined}
          onClick={async () => {
            const value = await openDialog(IconSelectorDialog);
            if (value) {
              editorState().getEditorDoc().getSelection()?.collapseToStart();
              contentEditableStore().execCommand(
                'insertHTML',
                `<i class="${value}"/>`,
              );
              contentEditableStore().setHasInlineSelection(false);
            }
          }}
          value="selectIcon"
        >
          <EmojiEmotionsIcon />
        </IconButton>
      </div>
    </div>
  );
}

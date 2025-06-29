import {ElementOverlayLayout} from '@app/editor/elements/element-overlays/element-overlay-layout';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {Fragment, ReactNode, useEffect, useRef} from 'react';
import {
  HoveredElementOverlay,
  SelectedElementOverlay,
} from '@app/editor/elements/element-overlays/element-overlays';
import clsx from 'clsx';
import {SettingsIcon} from '@common/icons/material/Settings';
import {CloseIcon} from '@common/icons/material/Close';
import {
  DragPreviewRenderer,
  useDraggable,
} from '@common/ui/interactions/dnd/use-draggable';
import {DragIndicatorIcon} from '@common/icons/material/DragIndicator';
import {ElementDragPreview} from '@app/editor/elements/element-drag-preview';
import {useContentEditableStore} from '@app/editor/state/content-editable-store';
import {
  autoUpdate,
  flip,
  Placement,
  shift,
  useFloating,
} from '@floating-ui/react-dom';
import {findNodeById} from '@app/editor/utils/find-nodes-by-id';
import {DeleteNode} from '@app/editor/mutations/dom/delete-node';
import {
  resizeHandlePosition,
  useResize,
} from '@common/ui/interactions/use-resize';
import {ImageEl} from '@app/editor/elements/definitions/bootstrap';
import {ResizeNode} from '@app/editor/mutations/style/resize-node';
import {ColumnEl, RowEl} from '@app/editor/elements/definitions/grid';
import {executePrimaryContextAction} from '@app/editor/elements/execute-primary-context-action';
import {mutationState} from '@app/editor/state/mutation-store';

export function HoveredElementOverlayCmp() {
  const isVisible = useEditorStore(s => !!s.hoveredContext?.isVisible);
  const isImage = useEditorStore(s => s.hoveredContext?.el instanceof ImageEl);

  const {refs, floatingStyles, placement} = useFloating<HTMLDivElement>({
    placement: 'top',
    middleware: [
      flip({
        mainAxis: true,
        crossAxis: false,
      }),
      shift({
        mainAxis: true,
        crossAxis: true,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const {resizeProps} = useResize({
    boundaryRect: editorState().iframeRect,
    aspectRatio: isImage ? 'initial' : null,
    onResizeStart: e => {
      SelectedElementOverlay.hide();
      editorState().setIsResizing(true);
    },
    onResize: e => {
      const node = editorState().hoveredContext?.node;
      if (node) {
        mutationState().executeMutation(
          new ResizeNode(
            {width: `${e.rect.width}px`, height: `${e.rect.height}px`},
            node,
          ),
          {partOfSession: true},
        );
        HoveredElementOverlay.reposition();
      }
    },
    onResizeEnd: e => {
      const node = editorState().hoveredContext?.node;
      if (node) {
        mutationState().executeMutation(
          new ResizeNode(
            {width: `${e.rect.width}px`, height: `${e.rect.height}px`},
            node,
          ),
          {lastInSession: true},
        );
      }
      SelectedElementOverlay.reposition();
      SelectedElementOverlay.show();
      editorState().setIsResizing(false);
    },
  });

  useEffect(() => {
    if (refs.reference.current) {
      HoveredElementOverlay.overlayNode = refs.reference.current;
    }
  }, [refs]);

  return (
    <ElementOverlayLayout
      className={clsx(
        'hover-element-overlay after:outline-2 after:outline-primary',
      )}
      overlayRef={refs.setReference}
      isVisible={isVisible}
      {...resizeProps}
    >
      <Toolbar
        toolbarRef={refs.setFloating}
        styles={floatingStyles}
        placement={placement}
      />
      <ResizeHandle />
    </ElementOverlayLayout>
  );
}

function ResizeHandle() {
  return (
    <button
      data-resize-handle={resizeHandlePosition.bottomRight}
      onMouseEnter={() => HoveredElementOverlay.show()}
      className="pointer-events-auto absolute -bottom-4 -right-8 z-10 h-10 w-10 cursor-nwse-resize before:absolute before:right-6 before:top-2 before:h-6 before:w-6 before:border before:border-primary before:bg"
    />
  );
}

interface ToolbarProps {
  toolbarRef: React.Ref<HTMLDivElement>;
  styles: React.CSSProperties;
  placement: Placement;
}
function Toolbar({toolbarRef, styles, placement}: ToolbarProps) {
  const haveCtx = useEditorStore(s => !!s.hoveredContext);
  const selectedCtxNodeId = useEditorStore(s => s.selectedContext?.nodeId);
  const hoveredCtxNodeId = useEditorStore(s => s.hoveredContext?.nodeId);
  const isEditingContent = useContentEditableStore(s => s.sessionIsActive);
  const shouldHideToolbar =
    selectedCtxNodeId === hoveredCtxNodeId && isEditingContent;
  const isRowOrColumn = useEditorStore(
    s =>
      s.hoveredContext &&
      (s.hoveredContext.el instanceof ColumnEl ||
        s.hoveredContext.el instanceof RowEl),
  );
  return (
    <div
      onMouseEnter={() => HoveredElementOverlay.show()}
      ref={toolbarRef}
      style={styles}
      className={clsx(
        shouldHideToolbar
          ? 'pointer-events-none invisible'
          : 'pointer-events-auto',
        'element-overlay-toolbar absolute left-0 top-full z-10 flex select-none items-center justify-center overflow-hidden bg-primary',
        placement === 'bottom' ? 'rounded-b' : 'rounded-t',
      )}
    >
      <ActionButton>
        <SettingsIcon size="h-16 w-16" />
      </ActionButton>
      {haveCtx && <DragButton />}
      <ActionButton
        disabled={!!isRowOrColumn}
        onClick={() => {
          const node = findNodeById(
            hoveredCtxNodeId!,
            editorState().getEditorDoc(),
          );
          if (node) {
            mutationState().executeMutation(new DeleteNode(node), {
              lastInSession: true,
            });
          }
        }}
      >
        <CloseIcon size="h-18 w-18" />
      </ActionButton>
    </div>
  );
}

function DragButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<DragPreviewRenderer>(null);
  const {draggableProps} = useDraggable({
    id: 'element-overlay',
    type: 'element-panel',
    ref,
    preview: previewRef,
    getData: () => editorState().hoveredContext,
    onDragStart: () => editorState().setDragState('dragging'),
    onDragEnd: () => editorState().setDragState(false),
  });
  return (
    <Fragment>
      <ActionButton buttonRef={ref} {...draggableProps} className="cursor-move">
        <DragIndicatorIcon className="rotate-90" size="h-22 w-22" />
      </ActionButton>
      <ElementDragPreview
        ref={previewRef}
        element={editorState().hoveredContext!.el}
      />
    </Fragment>
  );
}

interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
}
function ActionButton({
  children,
  className,
  buttonRef,
  disabled,
  ...domProps
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        executePrimaryContextAction(editorState().hoveredContext);
      }}
      ref={buttonRef}
      className={clsx(
        'flex h-26 w-26 items-center justify-center bg-primary text-white transition-colors',
        !disabled && 'hover:bg-primary',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...domProps}
    >
      {children}
    </button>
  );
}

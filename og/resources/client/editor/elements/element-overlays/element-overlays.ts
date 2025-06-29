import {editorState} from '@app/editor/state/editor-store';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {ElementContextData} from '@app/editor/elements/element-context-data';
import {ColumnEl} from '@app/editor/elements/definitions/grid';
import {removePaddingFromPosition} from '@app/editor/utils/remove-padding-from-position';

abstract class ElementOverlay {
  overlayNode: HTMLElement | null = null;

  abstract getCurrentTarget(): ElementContextData | null;
  abstract remove(): void;
  abstract show(): void;
  abstract hide(): void;

  reposition(newTarget?: ElementContextData) {
    const target = newTarget ?? this.getCurrentTarget();
    if (
      !target ||
      target.node.nodeType !== Node.ELEMENT_NODE ||
      this.nodeIsHtmlOrBody(target.node) ||
      target.node.parentElement?.hasAttribute('contenteditable') ||
      !this.overlayNode
    ) {
      return this.hide();
    }

    const targetRect = target.node.getBoundingClientRect();
    let position = {
      top: targetRect.top,
      left: targetRect.left,
      width: targetRect.width,
      height: targetRect.height,
    };
    if (target.el instanceof ColumnEl) {
      position = removePaddingFromPosition(target.node, position);
    }

    if (!position.width || !position.height) {
      this.hide();
    } else {
      this.overlayNode.style.top = `${position.top}px`;
      this.overlayNode.style.left = `${position.left}px`;
      this.overlayNode.style.height = `${position.height}px`;
      this.overlayNode.style.width = `${position.width}px`;
      this.show();
    }
  }

  protected nodeIsHtmlOrBody(node: HTMLElement) {
    if (!node) return false;
    return node.nodeName === 'BODY' || node.nodeName === 'HTML';
  }
}

export const SelectedElementOverlay = new (class extends ElementOverlay {
  name = 'selected' as const;
  getCurrentTarget() {
    return editorState().selectedContext;
  }
  remove() {
    setSelectedContext(null);
  }
  hide() {
    const ctx = editorState().selectedContext;
    if (ctx?.isVisible) {
      editorState().setSelectedContext({
        ...ctx,
        isVisible: false,
      });
    }
  }

  show() {
    const ctx = editorState().selectedContext;
    if (ctx && !ctx.isVisible) {
      editorState().setSelectedContext({
        ...ctx,
        isVisible: true,
      });
    }
  }
})();
export const HoveredElementOverlay = new (class extends ElementOverlay {
  name = 'hovered' as const;
  getCurrentTarget() {
    return editorState().hoveredContext;
  }
  remove() {
    editorState().setHoveredContext(null);
  }
  hide() {
    const ctx = editorState().hoveredContext;
    if (ctx) {
      editorState().setHoveredContext({
        ...ctx,
        isVisible: false,
      });
    }
  }

  show() {
    const ctx = editorState().hoveredContext;
    if (ctx) {
      editorState().setHoveredContext({
        ...ctx,
        isVisible: true,
      });
    }
  }
})();

export function hideElementOverlays() {
  SelectedElementOverlay.hide();
  HoveredElementOverlay.hide();
}

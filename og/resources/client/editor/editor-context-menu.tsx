import {ContextMenu} from '@common/ui/navigation/menu/context-menu';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {MenuItem} from '@common/ui/navigation/menu/menu-trigger';
import {Trans} from '@common/i18n/trans';
import {DeleteNode} from '@app/editor/mutations/dom/delete-node';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {getNodeIndex} from '@app/editor/utils/get-node-index';
import {InsertNode} from '@app/editor/mutations/dom/insert-node';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {CloneNode} from '@app/editor/mutations/dom/clone-node';
import {Elements} from '@app/editor/elements/elements';
import {MoveNode} from '@app/editor/mutations/dom/move-node';
import {
  mutationState,
  useMutationStore,
} from '@app/editor/state/mutation-store';

let copiedNode: HTMLElement | null = null;

const setCopiedNode = (node: HTMLElement | null) => {
  if (node) {
    delete node.dataset.arId;
  }
  editorState().setHasCopiedNode(!!node);
  copiedNode = node;
};

const copyAction = () => {
  const node = editorState().selectedContext?.node;
  if (node && node.nodeName !== 'BODY') {
    setCopiedNode(node.cloneNode(true) as HTMLElement);
  }
};

const deleteAction = () => {
  const ctx = editorState().selectedContext;
  if (ctx) {
    mutationState().executeMutation(new DeleteNode(ctx.node), {
      lastInSession: true,
    });
  }
};

const moveAction = (dir: 'up' | 'down') => {
  const ctx = editorState().selectedContext;
  if (!ctx) return;

  const {node, el} = ctx;
  const oldIndex = getNodeIndex(node);
  const oldParentId = getNodeId(node.parentElement!);
  let newIndex: number = -1;
  let newParentId: string | null = null;

  if (dir === 'down') {
    const next = node.nextElementSibling as HTMLElement | null;
    if (next) {
      if (Elements.canInsertElInto(next, el)) {
        // into next node
        newIndex = 0;
        newParentId = getNodeId(next);
      } else {
        // after next node
        newIndex = getNodeIndex(next);
        newParentId = getNodeId(next.parentElement!);
      }
    } else {
      const parentParent = node.parentElement?.parentElement;
      if (parentParent && Elements.canInsertElInto(parentParent, el)) {
        // after parent
        newIndex = getNodeIndex(node.parentElement!) + 1;
        newParentId = getNodeId(parentParent);
      }
    }
  } else if (dir === 'up') {
    const prev = node.previousElementSibling as HTMLElement;
    if (prev) {
      // into previous
      if (Elements.canInsertElInto(prev, el)) {
        newIndex = prev.childElementCount;
        newParentId = getNodeId(prev);
      } else {
        // before previous
        newIndex = getNodeIndex(prev);
        newParentId = getNodeId(prev.parentElement!);
      }
    } else {
      const parentParent = node.parentElement?.parentElement;
      if (parentParent && Elements.canInsertElInto(parentParent, el)) {
        // before parent
        newIndex = getNodeIndex(node.parentElement);
        newParentId = getNodeId(parentParent);
      }
    }
  }

  if (newParentId && oldParentId && newIndex > -1) {
    mutationState().executeMutation(
      new MoveNode({
        el: node,
        oldIndex,
        oldParentId,
        newIndex,
        newParentId,
      }),
      {lastInSession: true},
    );
  }
};

export const contextMenuActions = {
  cut: () => {
    const node = editorState().selectedContext?.node;
    if (node && node.nodeName !== 'BODY') {
      copyAction();
      deleteAction();
    }
  },
  copy: copyAction,
  paste: () => {
    const ref = editorState().selectedContext?.node;
    if (ref && copiedNode) {
      let parent: string | null;
      let index: number;
      // make sure we don't paste refs after body
      if (ref.nodeName === 'BODY') {
        parent = getNodeId(ref);
        index = 0;
      } else {
        parent = getNodeId(ref.parentElement!);
        index = getNodeIndex(ref) + 1;
      }

      if (parent && index > -1) {
        mutationState().executeMutation(
          new InsertNode(copiedNode, index, parent),
          {lastInSession: true},
        );
        setCopiedNode(null);
        setSelectedContext(copiedNode);
      }
    }
  },
  duplicate: () => {
    const node = editorState().selectedContext?.node;
    if (node) {
      mutationState().executeMutation(new CloneNode(node), {
        lastInSession: true,
      });
    }
  },
  moveUp: () => moveAction('up'),
  moveDown: () => moveAction('down'),
  delete: deleteAction,
  undo: () => mutationState().undo(),
  redo: () => mutationState().redo(),
  selectParent: () => {
    const parent = editorState().selectedContext?.node.parentElement;
    if (parent) {
      setSelectedContext(parent);
    }
  },
  selectChild: () => {
    const child = editorState().selectedContext?.node.firstElementChild;
    if (child) {
      setSelectedContext(child as HTMLElement);
    }
  },
};

export function EditorContextMenu() {
  const position = useEditorStore(s => s.contextMenuPosition);
  const canPaste = useEditorStore(s => s.hasCopiedNode);
  const canUndo = useMutationStore(s => s.canUndo);
  const canRedo = useMutationStore(s => s.canRedo);
  const canSelectParent = useEditorStore(
    s => (s.selectedContext?.path.length ?? 0) > 1,
  );
  return (
    <ContextMenu
      floatingMinWidth="min-w-280"
      position={position}
      onOpenChange={isOpen => {
        if (!isOpen) {
          editorState().setContextMenuPosition(null);
        }
      }}
      onItemSelected={value => {
        const actionName = value as keyof typeof contextMenuActions;
        if (contextMenuActions[actionName]) {
          contextMenuActions[actionName]();
        }
      }}
    >
      <MenuItem value="selectParent" isDisabled={!canSelectParent}>
        <Trans message="Select parent" />
      </MenuItem>
      <MenuItem value="selectChild" className="border-b">
        <Trans message="Select child" />
      </MenuItem>
      <MenuItem
        value="cut"
        endSection={<span className="text-xs">ctrl+shift+x</span>}
      >
        <Trans message="Cut" />
      </MenuItem>
      <MenuItem
        value="copy"
        endSection={<span className="text-xs">ctrl+shift+c</span>}
      >
        <Trans message="Copy" />
      </MenuItem>
      <MenuItem
        isDisabled={!canPaste}
        value="paste"
        endSection={<span className="text-xs">ctrl+shift+v</span>}
      >
        <Trans message="Paste" />
      </MenuItem>
      <MenuItem
        value="delete"
        endSection={<span className="text-xs">del</span>}
      >
        <Trans message="Delete" />
      </MenuItem>
      <MenuItem value="duplicate">
        <Trans message="Duplicate" />
      </MenuItem>
      <MenuItem
        value="moveUp"
        endSection={
          <span className="text-xs">
            <Trans message="arrow up" />
          </span>
        }
      >
        <Trans message="Move up" />
      </MenuItem>
      <MenuItem
        value="moveDown"
        endSection={
          <span className="text-xs">
            <Trans message="arrow down" />
          </span>
        }
      >
        <Trans message="Move down" />
      </MenuItem>
      <MenuItem
        className="border-t"
        isDisabled={!canUndo}
        value="undo"
        endSection={<span className="text-xs">ctrl+z</span>}
      >
        <Trans message="Undo" />
      </MenuItem>
      <MenuItem
        isDisabled={!canRedo}
        value="redo"
        endSection={<span className="text-xs">ctrl+y</span>}
      >
        <Trans message="Redo" />
      </MenuItem>
    </ContextMenu>
  );
}

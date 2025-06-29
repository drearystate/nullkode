import {create} from 'zustand';
import {editorState} from '@app/editor/state/editor-store';
import {LinkEditorValue} from '@app/editor/link-editor-dialog/link-editor-value';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {ReplaceNodeContent} from '@app/editor/mutations/dom/replace-node-content';
import {IframeHasSelectedText} from '@app/editor/utils/iframe-has-selected-text';
import {mutationState} from '@app/editor/state/mutation-store';

type Command =
  | 'bold'
  | 'underline'
  | 'italic'
  | 'createLink'
  | 'unlink'
  | 'insertHTML';

let session: {initialHtml?: string; node?: HTMLElement} = {};

interface State {
  activeCommands: Command[];
  sessionIsActive: boolean;
  hasInlineSelection: boolean;
  repositionToolbar: (() => void) | undefined;
}

const initialState: State = {
  activeCommands: [],
  sessionIsActive: false,
  hasInlineSelection: false,
  repositionToolbar: undefined,
};

interface Actions {
  syncActiveCommands: () => void;
  execCommand: (command: Command, value?: unknown) => void;
  startSession: () => void;
  endSession: () => void;
  setHasInlineSelection: (hasInlineSelection: boolean) => void;
  setRepositionToolbar: (repositionToolbar: () => void | undefined) => void;
  reset: () => void;
}

export const useContentEditableStore = create<State & Actions>()((set, get) => {
  return {
    ...initialState,
    reset: () => set(initialState),
    setHasInlineSelection: hasInlineSelection => {
      set({hasInlineSelection});
    },
    setRepositionToolbar: repositionToolbar => {
      set({repositionToolbar});
    },
    startSession: () => {
      const selectedNode = editorState().selectedContext?.node;
      if (selectedNode) {
        HoveredElementOverlay.remove();
        session.initialHtml = selectedNode.innerHTML;
        session.node = selectedNode;
        selectedNode.contentEditable = 'true';
        selectedNode.focus();
        set({sessionIsActive: true});

        // if text is selected via double click, we want to show the toolbar
        if (IframeHasSelectedText(selectedNode)) {
          contentEditableStore().setHasInlineSelection(true);
          contentEditableStore().syncActiveCommands();
        }
      }
    },
    endSession: () => {
      // clear session immediately so if "endSession"
      // is called twice in a row it will not result in a loop
      const currentSession = {...session};
      session = {};
      set({sessionIsActive: false, hasInlineSelection: false});
      if (currentSession.node) {
        currentSession.node.removeAttribute('contenteditable');
        const modifiedHtml = currentSession.node.innerHTML;
        if (
          currentSession.initialHtml &&
          modifiedHtml !== session.initialHtml
        ) {
          mutationState().executeMutation(
            new ReplaceNodeContent(
              currentSession.node,
              currentSession.initialHtml,
              modifiedHtml,
            ),
            {lastInSession: true},
          );
        }
      }
    },
    syncActiveCommands: () => {
      const commands: Command[] = [];
      if (editorState().getEditorDoc().queryCommandState('bold')) {
        commands.push('bold');
      }
      if (editorState().getEditorDoc().queryCommandState('underline')) {
        commands.push('underline');
      }
      if (editorState().getEditorDoc().queryCommandState('italic')) {
        commands.push('italic');
      }
      const selection = editorState().getEditorWindow().getSelection();
      if (selection?.anchorNode) {
        if (selection.anchorNode.parentNode?.nodeName === 'A') {
          commands.push('createLink');
        }
      }
      set({activeCommands: commands});
    },
    execCommand: (command: Command, value?: unknown) => {
      if (command === 'createLink') {
        const linkValue = value as LinkEditorValue;
        executeCommand('createLink', linkValue.href);
        if (linkValue.target) {
          editorState()
            .getEditorDoc()
            .getSelection()
            ?.anchorNode?.parentElement?.setAttribute(
              'target',
              linkValue.target,
            );
        }
      } else {
        executeCommand(command, value as string);
      }
      get().syncActiveCommands();
    },
  };
});

export function contentEditableStore() {
  return useContentEditableStore.getState();
}

function executeCommand(command: Command, value?: string | null) {
  editorState()
    .getEditorDoc()
    .execCommand(command, false, value ?? undefined);
}

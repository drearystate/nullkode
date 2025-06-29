import {create} from 'zustand';
import {BaseMutation} from '@app/editor/mutations/base-mutation';
import {editorState} from '@app/editor/state/editor-store';
import {inspectorState} from '@app/editor/state/inspector-store';
import {
  HoveredElementOverlay,
  SelectedElementOverlay,
} from '@app/editor/elements/element-overlays/element-overlays';
import {layoutEditorState} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';

export interface ExecuteMutationOptions {
  partOfSession?: boolean;
  lastInSession?: boolean;
  skipHistory?: boolean;
  forceSyncEditor?: boolean;
  forceAddToHistory?: boolean;
}

interface State {
  isDirty: boolean;
  mutationStack: BaseMutation[];
  canUndo: boolean;
  canRedo: boolean;
  pointer: number;
}

const maxHistory = 500;

const initialState: State = {
  isDirty: false,
  mutationStack: [],
  canUndo: false,
  canRedo: false,
  pointer: -1,
};

interface Actions {
  executeMutation: (
    mutation: BaseMutation,
    options: ExecuteMutationOptions,
  ) => boolean;
  undo: () => void;
  redo: () => void;
  goTo: (index: number) => void;
  setPointer: (pointer: number) => void;
  reset: () => void;
  setIsDirty: (isDirty: boolean) => void;
}

interface SessionCacheItem {
  executed: boolean;
  mutation: BaseMutation;
}
let sessionCache: SessionCacheItem[] = [];

export const useMutationStore = create<State & Actions>()((set, get) => {
  return {
    ...initialState,
    setIsDirty: isDirty => set({isDirty}),
    reset: () => set(initialState),
    executeMutation: (mutation, options) => {
      let executed = mutation.init().execute();
      const newSessionCacheItem = {executed, mutation};

      // if it's a different mutation class or last item
      // in session, clear session and add to history
      const addToHistory =
        !options?.skipHistory &&
        (options?.lastInSession ||
          (sessionCache.length &&
            (sessionCache[0].mutation.constructor !== mutation.constructor ||
              sessionCache[0].mutation.getNodeId() !== mutation.getNodeId())));

      if (addToHistory) {
        const merged = mergeMutations([...sessionCache, newSessionCacheItem]);
        executed = merged.executed;
        mutation = merged.mutation;
      }

      if (options?.lastInSession) {
        sessionCache = [];
      }

      if (options?.partOfSession) {
        sessionCache.push(newSessionCacheItem);
      }

      if (executed) {
        if (addToHistory) {
          // remove all stack items after new pointer (if pushing after undoing)
          let newStack = [...get().mutationStack];
          if (get().canRedo) {
            newStack = newStack.slice(0, get().pointer + 1);
          }
          newStack.push(mutation);

          if (newStack.length > maxHistory) {
            newStack = newStack.slice(newStack.length - maxHistory);
          }

          set({
            mutationStack: newStack,
          });

          get().setPointer(Math.min(maxHistory - 1, get().pointer + 1));
        }
        syncEditor(!options?.forceSyncEditor && options?.partOfSession);
      }

      return executed;
    },
    undo: () => {
      const mutation = get().mutationStack[get().pointer];
      if (mutation) {
        mutation.undo();
        get().setPointer(get().pointer - 1);
        syncEditor();
      }
    },
    redo() {
      const mutation = get().mutationStack[get().pointer + 1];
      if (mutation) {
        mutation.redo();
        get().setPointer(get().pointer + 1);
        syncEditor();
      }
    },
    goTo(index: number) {
      if (index === get().pointer) return;

      if (index < get().pointer) {
        for (let i = get().pointer; i > index; i--) {
          get().mutationStack[i].undo();
        }
      } else {
        for (let i = get().pointer + 1; i <= index; i++) {
          get().mutationStack[i].redo();
        }
      }

      get().setPointer(index);
      syncEditor();
    },
    setPointer(newPointer: number) {
      set({
        pointer: newPointer,
        canUndo: newPointer !== -1,
        canRedo: newPointer < get().mutationStack.length - 1,
      });
    },
  };
});

export function mutationState() {
  return useMutationStore.getState();
}

function syncEditor(partial = false) {
  const ctx = editorState().selectedContext;
  if (ctx) {
    if (!partial) {
      inspectorState().setInitialConfig(ctx);
    }
    if (!editorState().isResizing) {
      SelectedElementOverlay.reposition();
    }
  }
  if (!partial) {
    layoutEditorState().loadContainers();
    mutationState().setIsDirty(true);
  }
  if (!editorState().isResizing) {
    HoveredElementOverlay.remove();
  }
}

function mergeMutations(stack: SessionCacheItem[]): SessionCacheItem {
  if (stack.length < 2) return stack[0];
  const first = stack[0];
  const last = stack[stack.length - 1];
  last.mutation.overrideInitialValue(first.mutation.getInitialValue());
  last.executed = stack.some(s => s.executed);
  return last;
}

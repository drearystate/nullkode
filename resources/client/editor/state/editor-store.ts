import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';
import {
  BuilderPage,
  BuilderPageWithId,
  EditorProject,
} from '@app/dashboard/project';
import {addIdToPages} from '@app/editor/utils/add-id-to-pages';
import {createDocFromHtml} from '@app/editor/utils/create-doc-from-html';
import {getProjectEditorUrl} from '@app/projects/project-link';
import {SidebarPanel} from '@app/editor/editor-sidebar/sidebar-panel';
import {ElementContextData} from '@app/editor/elements/element-context-data';
import {contentEditableStore} from '@app/editor/state/content-editable-store';
import {editorScreenBreakpoint} from '@app/editor/editor-sidebar/breakpoint-selector/editor-screen-breakpoint';
import {InteractableRect} from '@common/ui/interactions/interactable-event';
import {domRectToObj} from '@common/ui/interactions/utils/dom-rect-to-obj';
import {SelectedElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {editorUploadState} from '@app/editor/state/editor-upload-store';
import {inspectorState} from '@app/editor/state/inspector-store';
import {mutationState} from '@app/editor/state/mutation-store';

let iframe: HTMLIFrameElement | null = null;

interface StoreElementContextData extends ElementContextData {
  nodeId: string | null;
  isVisible: boolean;
}

export interface SelectedElementContextData extends StoreElementContextData {
  path: {nodeId: string | null; name: string}[];
}

interface EditorActions {
  setSelectedBreakpoint: (breakpoint: editorScreenBreakpoint | null) => void;
  setContextMenuPosition: (position: {x: number; y: number} | null) => void;
  setHasCopiedNode: (hasCopiedNode: boolean) => void;
  setActivePanel: (tab: SidebarPanel) => void;
  setSelectedContext: (context: SelectedElementContextData | null) => void;
  getSelectedContextStyle: () => CSSStyleDeclaration | null;
  setHoveredContext: (context: StoreElementContextData | null) => void;
  updateProject: (project: EditorProject) => void;
  init: (project: EditorProject, iframe: HTMLIFrameElement) => void;
  addNewPage: (page: BuilderPageWithId) => BuilderPageWithId;
  deletePage: (pageId: string) => void;
  setActivePage: (pageId: string) => void;
  updatePage: (pageId: string, values: Partial<BuilderPage>) => void;
  setDragState: (dragState: 'dragging' | 'outOfBounds' | false) => void;
  setIsResizing: (isResizing: boolean) => void;
  getEditorDoc: () => Document;
  getEditorWindow: () => Window;
  getIframe: () => HTMLIFrameElement | null;
  getActivePageDoc: () => Document | null;
  setSidebarIsVisible: (isVisible: boolean) => void;
  syncIframeRect: () => void;
  reset: () => void;
}

interface EditorState {
  iframeLoading: boolean;
  elementsLoading: boolean;
  sidebarIsVisible: boolean;
  selectedBreakpoint: editorScreenBreakpoint | null;
  contextMenuPosition: {x: number; y: number} | null;
  hasCopiedNode: boolean;
  activePanel: SidebarPanel;
  activePageId: string | null;
  selectedContext: SelectedElementContextData | null;
  hoveredContext: StoreElementContextData | null;
  project: EditorProject | null;
  dragState: 'dragging' | 'outOfBounds' | false;
  isResizing: boolean;
  sidebarWidth: string;
  iframeRect: InteractableRect;
}

const initialState: EditorState = {
  sidebarWidth: '350px',
  sidebarIsVisible: true,
  iframeLoading: true,
  iframeRect: {top: 0, left: 350, width: 0, height: 0},
  elementsLoading: true,
  selectedBreakpoint: null,
  contextMenuPosition: null,
  hasCopiedNode: false,
  hoveredContext: null,
  activePanel: SidebarPanel.ELEMENTS,
  activePageId: null,
  project: null,
  selectedContext: null,
  dragState: false,
  isResizing: false,
};

export const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((...a) => {
    const get = a[1];
    const set = a[0];
    return {
      ...initialState,
      reset: () => {
        set(initialState);
        contentEditableStore().reset();
        editorUploadState().reset();
        inspectorState().reset();
        mutationState().reset();
      },
      setSidebarIsVisible: isVisible => {
        set({sidebarIsVisible: isVisible});
        setTimeout(() => {
          editorState().syncIframeRect();
        }, 300);
      },
      syncIframeRect: () => {
        if (iframe) {
          set({iframeRect: domRectToObj(iframe.getBoundingClientRect())});
        }
      },
      setSelectedBreakpoint: breakpoint => {
        if (breakpoint === editorScreenBreakpoint.desktop) {
          breakpoint = null;
        }
        set({selectedBreakpoint: breakpoint});
        requestAnimationFrame(() => {
          SelectedElementOverlay.reposition();
        });
      },
      setContextMenuPosition: position => set({contextMenuPosition: position}),
      setHasCopiedNode: hasCopiedNode => set({hasCopiedNode}),
      getIframe: () => iframe,
      setSelectedContext: (ctx: SelectedElementContextData | null) => {
        contentEditableStore().endSession();
        set({selectedContext: ctx});
      },
      getSelectedContextStyle: () => {
        if (get().selectedContext?.node) {
          return get()
            .getEditorWindow()
            .getComputedStyle(get().selectedContext!.node);
        }
        return null;
      },
      setHoveredContext: (context: StoreElementContextData | null) => {
        set({hoveredContext: context});
      },
      setDragState: dragState => set({dragState}),
      setIsResizing: isResizing => set({isResizing}),
      setActivePanel: (panel: SidebarPanel) => set({activePanel: panel}),
      init: (project: EditorProject, initIframe: HTMLIFrameElement) => {
        iframe = initIframe;
        get().syncIframeRect();
        project.pages = addIdToPages(project.pages);
        set({project});
        get().setActivePage(project.pages[0].id);
      },
      updateProject: (newProject: EditorProject) => {
        set({
          project: {
            ...newProject,
            pages: newProject.pages.map(newPage => {
              const oldPage = get().project!.pages.find(
                op => op.name === newPage.name,
              );
              if (oldPage) {
                return {
                  ...newPage,
                  doc: oldPage.doc,
                  id: oldPage.id,
                };
              }
              return newPage;
            }),
          },
        });
      },
      setActivePage: (pageId: string) => {
        if (get().activePageId === pageId) {
          return;
        }
        const page = get().project?.pages.find(curr => curr.id === pageId);
        if (page) {
          if (!page.doc) {
            page.doc = createDocFromHtml(page.html);
          }
          set({activePageId: pageId});
          buildSrcDoc(page);
        }
      },
      updatePage: (pageId, values) => {
        const project = get().project;
        if (project) {
          set({
            project: {
              ...project,
              pages: project.pages.map(page =>
                page.id === pageId ? {...page, ...values} : page,
              ),
            },
          });
        }
      },
      addNewPage: page => {
        const project = get().project;
        if (project) {
          set({
            project: {...project, pages: [...project.pages, page]},
          });
        }
        return page;
      },
      deletePage: pageId => {
        const project = get().project;
        if (project) {
          set({
            project: {
              ...project,
              pages: project.pages.filter(page => page.id !== pageId),
            },
          });
        }
      },
      getEditorDoc: () => iframe?.contentDocument!,
      getEditorWindow: () => iframe?.contentWindow!,
      getActivePageDoc: () =>
        get().project?.pages.find(curr => curr.id === get().activePageId)
          ?.doc ?? null,
    };
  }),
);

export function editorState() {
  return useEditorStore.getState();
}

function buildSrcDoc(page: BuilderPage) {
  if (page.doc && iframe) {
    const base = page.doc.createElement('base');
    base.href = getProjectEditorUrl(editorState().project!);
    page.doc.head.prepend(base);
    const outerHTML = page.doc.documentElement.outerHTML;
    base.remove();
    iframe.srcdoc = outerHTML;
  }
}

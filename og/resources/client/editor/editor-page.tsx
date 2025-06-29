import {useEditorProject} from '@app/projects/use-editor-project';
import React, {Fragment, useEffect, useRef} from 'react';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {EditorSidebar} from '@app/editor/editor-sidebar/editor-sidebar';
import {DropzoneOverlay} from '@app/editor/dnd/dropzone-overlay';
import {DropPlaceholder} from '@app/editor/dnd/drop-placeholder';
import {initEditor} from '@app/editor/init-editor';
import {InitialLoadingIndicator} from '@app/editor/initial-loading-indicator/initial-loading-indicator';
import {useAuth} from '@common/auth/use-auth';
import {useNavigate} from '@common/utils/hooks/use-navigate';
import {ContentEditableFloatingToolbar} from '@app/editor/elements/element-overlays/content-editable-floating-toolbar';
import {HoveredElementOverlayCmp} from '@app/editor/elements/element-overlays/hovered-element-overlay-cmp';
import {SelectedElementOverlayCmp} from '@app/editor/elements/element-overlays/selected-element-overlay-cmp';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {EditorContextMenu} from '@app/editor/editor-context-menu';
import {observeSize} from '@common/utils/dom/observe-size';
import clsx from 'clsx';
import {ResizeOverlay} from '@app/editor/dnd/resize-overlay';
import {useAccountUsage} from '@app/editor/use-account-usage';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Trans} from '@common/i18n/trans';

export default function EditorPage() {
  // preload account usage on editor load
  const {} = useAccountUsage();
  const {user, hasPermission} = useAuth();
  const navigate = useNavigate();
  const {data, isLoading: projectLoading} = useEditorProject();
  const ref = useRef<HTMLIFrameElement>(null!);
  const iframeLoading = useEditorStore(s => s.iframeLoading);
  const elementsLoading = useEditorStore(s => s.elementsLoading);
  const isLoading = iframeLoading || elementsLoading || projectLoading;
  const selectedBreakpoint = useEditorStore(s => s.selectedBreakpoint);

  useEffect(() => {
    return () => {
      if (editorState().project) {
        editorState().reset();
      }
    };
  }, []);

  useEffect(() => {
    return observeSize(ref, () => {
      editorState().syncIframeRect();
    });
  }, []);

  useEffect(() => {
    if (
      data?.project &&
      editorState().project?.model.id !== data.project.model.id
    ) {
      if (
        !hasPermission('projects.update') &&
        data.project.model.user_id !== user?.id
      ) {
        navigate('/dashboard');
      } else {
        editorState().init(data.project, ref.current);
      }
    }
  }, [data?.project, hasPermission, navigate, user]);

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="Editor" />
      </StaticPageTitle>
      {isLoading && <InitialLoadingIndicator key="initialLoadingIndicator" />}
      <FileUploadProvider>
        <div
          className="flex h-screen w-screen overflow-hidden transition-opacity delay-75 duration-500"
          style={{opacity: isLoading ? 0 : 1}}
        >
          <EditorSidebar project={data?.project.model} />
          <div className="relative flex-auto bg-[#404040] transition-width">
            <div
              className={clsx(
                'breakpoint-wrapper relative mx-auto h-full w-full overflow-hidden bg-transparent transition-width',
                selectedBreakpoint &&
                  `breakpoint-active breakpoint-${selectedBreakpoint}`,
              )}
            >
              <iframe
                ref={ref}
                className="h-full w-full"
                onLoad={() => initEditor()}
              />
              <DropzoneOverlay />
              <ResizeOverlay />
              <DropPlaceholder />
              <HoveredElementOverlayCmp />
              <SelectedElementOverlayCmp />
              <ContentEditableFloatingToolbar />
              <EditorContextMenu />
            </div>
          </div>
        </div>
      </FileUploadProvider>
    </Fragment>
  );
}

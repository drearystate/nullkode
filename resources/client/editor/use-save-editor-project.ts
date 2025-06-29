import {useMutation} from '@tanstack/react-query';
import {apiClient} from '@common/http/query-client';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {showHttpErrorToast} from '@common/utils/http/show-http-error-toast';
import {editorState} from '@app/editor/state/editor-store';
import {useParams} from 'react-router-dom';
import {EditorProject} from '@app/dashboard/project';
import {default as html2canvas} from 'html2canvas';
import {removeUnusedGoogleFontTags} from '@app/editor/mutations/style/text/set-font-family';
import {mutationState} from '@app/editor/state/mutation-store';

interface Response extends BackendResponse {
  project: EditorProject;
}

interface SaveProjectPayload {
  name: string;
  css?: string;
  js?: string;
  custom_element_css?: string;
  pages: {name: string; html: string}[];
}

interface Options {
  updateThumbnail?: boolean;
}

export function useSaveEditorProject(options?: Options) {
  const {projectId} = useParams();
  return useMutation({
    mutationFn: (payload?: Partial<SaveProjectPayload>) =>
      saveProject(projectId!, payload, options),
    onSuccess: response => {
      editorState().updateProject(response.project);
      mutationState().setIsDirty(false);
    },
    onError: err => showHttpErrorToast(err),
  });
}

async function saveProject(
  projectId: string,
  data?: Partial<SaveProjectPayload>,
  options?: Options,
) {
  removeUnusedGoogleFontTags();
  const project = editorState().project!;
  const payload: SaveProjectPayload & {loader: string} = {
    name: project.model.name,
    css: project.css,
    js: project.js,
    loader: 'editor',
    ...data,
    pages: project.pages.map(page => ({
      name: page.name,
      html: page.doc ? page.doc.documentElement.outerHTML : page.html,
    })),
  };

  if (options?.updateThumbnail) {
    await generateThumbnail(projectId);
  }

  return apiClient
    .put<Response>(`projects/${projectId}`, payload)
    .then(r => r.data);
}

async function generateThumbnail(projectId: string) {
  const doc = editorState().getEditorDoc();
  const rect = doc.documentElement.getBoundingClientRect();
  const canvas = await html2canvas(doc.documentElement, {
    height: rect.height,
    width: rect.width,
  });
  return apiClient
    .post(`projects/${projectId}/generate-thumbnail`, {
      dataUrl: canvas.toDataURL('image/png'),
    })
    .then(r => r.data);
}

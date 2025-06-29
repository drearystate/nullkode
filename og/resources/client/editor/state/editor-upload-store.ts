import {createFileUploadStore} from '@common/uploads/uploader/file-upload-store';
import {getBootstrapData} from '@common/core/bootstrap-data/use-backend-bootstrap-data';

export const useEditorUploadStore = createFileUploadStore({
  settings: getBootstrapData().settings,
});

export function editorUploadState() {
  return useEditorUploadStore.getState();
}

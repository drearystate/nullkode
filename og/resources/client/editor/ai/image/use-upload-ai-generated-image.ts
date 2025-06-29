import {useMutation} from '@tanstack/react-query';
import {apiClient} from '@common/http/query-client';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {FileEntry} from '@common/uploads/file-entry';
import {showHttpErrorToast} from '@common/utils/http/show-http-error-toast';

interface Response extends BackendResponse {
  fileEntry: FileEntry;
}

interface Payload {
  url: string;
}

export function useUploadAiGeneratedImage() {
  return useMutation({
    mutationKey: ['aiGenerateImage'],
    mutationFn: (payload: Payload) => uploadImage(payload),
    onError: err => showHttpErrorToast(err),
  });
}

async function uploadImage(payload: Payload) {
  return apiClient
    .post<Response>('ai/upload-generated-image', payload)
    .then(r => r.data);
}

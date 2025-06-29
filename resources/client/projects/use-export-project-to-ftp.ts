import {useMutation} from '@tanstack/react-query';
import {apiClient} from '@common/http/query-client';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {showHttpErrorToast} from '@common/utils/http/show-http-error-toast';
import {FtpCredentials, Project} from '@app/dashboard/project';
import {invalidateProjectQueryKey} from '@app/projects/use-project';
import {UseFormReturn} from 'react-hook-form';
import {onFormQueryError} from '@common/errors/on-form-query-error';

interface Response extends BackendResponse {
  project: Project;
}

export function useExportProjectToFtp(
  projectId: number,
  form?: UseFormReturn<FtpCredentials>,
) {
  return useMutation({
    mutationFn: (payload: FtpCredentials) => exportToFtp(projectId, payload),
    onSuccess: () => {
      return invalidateProjectQueryKey(projectId);
    },
    onError: err =>
      form ? onFormQueryError(err, form) : showHttpErrorToast(err),
  });
}

async function exportToFtp(projectId: number, payload: FtpCredentials) {
  return apiClient
    .post<Response>(`projects/${projectId}/export/ftp`, payload)
    .then(r => r.data);
}

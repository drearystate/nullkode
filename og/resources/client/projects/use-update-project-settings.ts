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

export interface ProjectSettingsPayload {
  domainId?: number | null;
  published?: boolean;
  formsEmail?: string;
  ftpCredentials?: FtpCredentials;
}

export function useUpdateProjectSettings(
  projectId: number,
  form?: UseFormReturn<ProjectSettingsPayload>,
) {
  return useMutation({
    mutationFn: (payload: ProjectSettingsPayload) =>
      updateProject(projectId, payload),
    onSuccess: () => {
      return invalidateProjectQueryKey(projectId);
    },
    onError: err =>
      form ? onFormQueryError(err, form) : showHttpErrorToast(err),
  });
}

async function updateProject(
  projectId: number,
  payload: ProjectSettingsPayload,
) {
  return apiClient
    .post<Response>(`projects/${projectId}/settings`, payload)
    .then(r => r.data);
}

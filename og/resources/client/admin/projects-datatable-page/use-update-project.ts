import {useMutation, useQueryClient} from '@tanstack/react-query';
import {UseFormReturn} from 'react-hook-form';
import {apiClient} from '@common/http/query-client';
import {toast} from '@common/ui/toast/toast';
import {useTrans} from '@common/i18n/use-trans';
import {onFormQueryError} from '@common/errors/on-form-query-error';
import {message} from '@common/i18n/message';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {EditorProject} from '@app/dashboard/project';
import {CreateProjectPayload} from '@app/projects/use-create-project';

interface Response extends BackendResponse {
  project: EditorProject;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export function useUpdateProject(
  projectId: number,
  form: UseFormReturn<UpdateProjectPayload>,
) {
  const {trans} = useTrans();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) =>
      updateProject(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['projects']});
      toast(trans(message('Project updated')));
    },
    onError: err => onFormQueryError(err, form),
  });
}

async function updateProject(
  projectId: number | string,
  payload: UpdateProjectPayload,
) {
  return apiClient
    .put<Response>(`projects/${projectId}`, payload)
    .then(r => r.data);
}

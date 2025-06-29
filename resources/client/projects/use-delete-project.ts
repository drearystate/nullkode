import {useMutation} from '@tanstack/react-query';
import {apiClient, queryClient} from '@common/http/query-client';
import {toast} from '@common/ui/toast/toast';
import {useTrans} from '@common/i18n/use-trans';
import {message} from '@common/i18n/message';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {showHttpErrorToast} from '@common/utils/http/show-http-error-toast';
import {reloadAccountUsage} from '@app/editor/use-account-usage';

interface Payload {
  projectId: number | string;
}

export function useDeleteProject() {
  const {trans} = useTrans();
  return useMutation({
    mutationFn: (payload: Payload) => deleteProject(payload),
    onSuccess: async () => {
      reloadAccountUsage();
      await queryClient.invalidateQueries({queryKey: ['projects']});
      toast(trans(message('Project deleted')));
    },
    onError: err => showHttpErrorToast(err),
  });
}

async function deleteProject({projectId}: Payload) {
  return apiClient
    .delete<BackendResponse>(`projects/${projectId}`)
    .then(r => r.data);
}

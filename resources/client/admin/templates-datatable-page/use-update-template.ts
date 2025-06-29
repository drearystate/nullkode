import {useMutation, useQueryClient} from '@tanstack/react-query';
import {UseFormReturn} from 'react-hook-form';
import {apiClient} from '@common/http/query-client';
import {toast} from '@common/ui/toast/toast';
import {useTrans} from '@common/i18n/use-trans';
import {onFormQueryError} from '@common/errors/on-form-query-error';
import {message} from '@common/i18n/message';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {
  CreateTemplatePayload,
  templatePayloadToFormData,
} from '@app/admin/templates-datatable-page/use-create-template';
import {BuilderTemplate} from '@app/templates/builder-template';

interface Response extends BackendResponse {
  template: BuilderTemplate;
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export function useUpdateTemplate(
  templateName: string,
  form: UseFormReturn<UpdateTemplatePayload>,
) {
  const {trans} = useTrans();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTemplatePayload) =>
      updateTemplate(templateName, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['templates']});
      toast(trans(message('Template updated')));
    },
    onError: err => onFormQueryError(err, form),
  });
}

async function updateTemplate(
  templateName: string,
  payload: UpdateTemplatePayload,
) {
  return apiClient
    .put<Response>(
      `templates/${templateName}`,
      templatePayloadToFormData(payload),
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    .then(r => r.data);
}

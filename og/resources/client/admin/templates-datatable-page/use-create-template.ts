import {useMutation, useQueryClient} from '@tanstack/react-query';
import {UseFormReturn} from 'react-hook-form';
import {apiClient} from '@common/http/query-client';
import {toast} from '@common/ui/toast/toast';
import {useTrans} from '@common/i18n/use-trans';
import {onFormQueryError} from '@common/errors/on-form-query-error';
import {message} from '@common/i18n/message';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {BuilderTemplate} from '@app/templates/builder-template';

interface Response extends BackendResponse {
  template: BuilderTemplate;
}

export interface CreateTemplatePayload {
  name: string;
  category: string;
  thumbnail: File;
  template: File;
  includeBootstrap: boolean;
}

export function useCreateTemplate(form: UseFormReturn<CreateTemplatePayload>) {
  const {trans} = useTrans();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => createTemplate(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['templates']});
      toast(trans(message('Template created')));
    },
    onError: err => onFormQueryError(err, form),
  });
}

async function createTemplate(payload: CreateTemplatePayload) {
  return apiClient
    .post<Response>(`templates`, templatePayloadToFormData(payload), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then(r => r.data);
}

export function templatePayloadToFormData(
  payload: Partial<CreateTemplatePayload>,
) {
  const formData = new FormData();
  if (payload.name) {
    formData.set('name', payload.name);
  }
  if (payload.category) {
    formData.set('category', payload.category);
  }
  if (payload.template) {
    formData.set('template', payload.template);
  }
  if (payload.thumbnail) {
    formData.set('thumbnail', payload.thumbnail);
  }
  if ('payload' in payload) {
    formData.set(
      'includeBootstrap',
      payload.includeBootstrap ? 'true' : 'false',
    );
  }
  return formData;
}

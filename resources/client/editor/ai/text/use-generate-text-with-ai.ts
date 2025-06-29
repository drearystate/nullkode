import {useMutation} from '@tanstack/react-query';
import {apiClient} from '@common/http/query-client';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {UseFormReturn} from 'react-hook-form';
import {onFormQueryError} from '@common/errors/on-form-query-error';
import {reloadAccountUsage} from '@app/editor/use-account-usage';

interface Response extends BackendResponse {
  content: string;
}

export interface GenerateTextWithAiPayload {
  prompt: string;
}

export function useGenerateTextWithAi(
  form: UseFormReturn<GenerateTextWithAiPayload>,
) {
  return useMutation({
    mutationFn: (payload: GenerateTextWithAiPayload) => generateText(payload),
    onError: err => onFormQueryError(err, form),
    onSuccess: () => {
      reloadAccountUsage();
    },
  });
}

async function generateText(payload: GenerateTextWithAiPayload) {
  return apiClient
    .post<Response>('ai/generate-text', payload)
    .then(r => r.data);
}

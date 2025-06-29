import {useMutation} from '@tanstack/react-query';
import {apiClient} from '@common/http/query-client';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {UseFormReturn} from 'react-hook-form';
import {onFormQueryError} from '@common/errors/on-form-query-error';
import {reloadAccountUsage} from '@app/editor/use-account-usage';

interface Response extends BackendResponse {
  url: string;
  size: string;
}

export interface GenerateImageWithAiPayload {
  prompt: string;
  style?: string;
  size?: string;
}

export function useGenerateImageWithAi(
  form: UseFormReturn<GenerateImageWithAiPayload>,
) {
  return useMutation({
    mutationKey: ['aiGenerateImage'],
    mutationFn: (payload: GenerateImageWithAiPayload) => generateImage(payload),
    onError: err => onFormQueryError(err, form),
    onSuccess: () => {
      reloadAccountUsage();
    },
  });
}

async function generateImage(payload: GenerateImageWithAiPayload) {
  return apiClient
    .post<Response>('ai/generate-image', payload)
    .then(r => r.data);
}

import {apiClient} from '@common/http/query-client';
import {useQuery} from '@tanstack/react-query';
import {BuilderTemplate} from '@app/templates/builder-template';

export interface GetTemplateResponse {
  template: BuilderTemplate;
}

export function useTemplate(templateName: string, loadPages = false) {
  return useQuery({
    queryKey: ['templates', `${templateName}`, loadPages],
    queryFn: () => fetchTemplate(templateName),
  });
}

export function fetchTemplate(templateName: string, loadPages = false) {
  return apiClient
    .get<GetTemplateResponse>(`templates/${templateName}`, {
      params: {loadPages},
    })
    .then(response => response.data);
}

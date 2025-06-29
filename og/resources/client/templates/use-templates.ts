import {useInfiniteData} from '@common/ui/infinite-scroll/use-infinite-data';
import {BuilderTemplate} from '@app/templates/builder-template';

export interface GetTemplatesParams {
  perPage?: string | number;
  page?: string | number;
  query?: string;
  orderBy?: string;
  orderDir?: string;
  category?: string;
}

export function useTemplates(params: GetTemplatesParams) {
  return useInfiniteData<BuilderTemplate>({
    queryKey: ['templates', params],
    endpoint: 'templates',
    paginate: 'simple',
    willSortOrFilter: true,
    queryParams: params as any,
  });
}

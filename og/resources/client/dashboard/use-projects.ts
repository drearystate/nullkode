import {Project} from '@app/dashboard/project';
import {
  useInfiniteData,
  UseInfiniteDataProps,
} from '@common/ui/infinite-scroll/use-infinite-data';
import {useActiveWorkspaceId} from '@common/workspace/active-workspace-id-context';

interface Params {
  userId?: string | number;
  published?: string;
  paginate?: UseInfiniteDataProps<undefined>['paginate'];
}

export function useProjects(params: Params) {
  const {workspaceId} = useActiveWorkspaceId();
  return useInfiniteData<Project>({
    queryKey: ['projects', {...params, workspaceId}],
    endpoint: 'projects',
    paginate: params.paginate || 'simple',
    defaultOrderBy: 'updated_at',
    defaultOrderDir: 'desc',
    queryParams: {
      ...params,
      workspaceId,
    },
    willSortOrFilter: true,
  });
}

import {apiClient, queryClient} from '@common/http/query-client';
import {Project} from '@app/dashboard/project';
import {useQuery} from '@tanstack/react-query';

interface Response {
  project: Project;
}

export function useProject(projectId: number | string, initialData?: Project) {
  return useQuery({
    queryKey: ['projects', `${projectId}`],
    queryFn: () => fetchProject(projectId!),
    initialData: () => ({project: initialData!}),
  });
}

export function invalidateProjectQueryKey(projectId: number | string) {
  return queryClient.invalidateQueries({
    queryKey: ['projects', `${projectId}`],
  });
}

function fetchProject(projectId: number | string) {
  return apiClient
    .get<Response>(`projects/${projectId}`)
    .then(response => response.data);
}

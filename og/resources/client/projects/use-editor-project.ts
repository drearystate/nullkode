import {apiClient} from '@common/http/query-client';
import {EditorProject} from '@app/dashboard/project';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

export interface GetEditorProjectResponse {
  project: EditorProject;
}

export function useEditorProject() {
  const {projectId} = useParams();
  return useQuery({
    queryKey: ['projects', `${projectId}`, 'editor'],
    queryFn: () => fetchProject(projectId!),
    staleTime: Infinity,
  });
}

function fetchProject(projectId: number | string) {
  return apiClient
    .get<GetEditorProjectResponse>(`projects/${projectId}`, {
      params: {loader: 'editor'},
    })
    .then(response => response.data);
}

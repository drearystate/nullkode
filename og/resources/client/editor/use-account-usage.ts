import {apiClient, queryClient} from '@common/http/query-client';
import {useQuery} from '@tanstack/react-query';
import {PolicyFailReason} from '@common/billing/upgrade/policy-fail-reason';

interface ResourceStatus {
  allowed: boolean;
  failReason?: PolicyFailReason;
}

interface ResourceUsage {
  used: number;
  total: number;
  create: ResourceStatus;
  update: ResourceStatus;
  delete: ResourceStatus;
}

interface AiUsage {
  hasPermission: boolean;
  used: number;
  total: number;
  failReason?: PolicyFailReason;
}

interface Response {
  ai: {
    text: AiUsage;
    images: AiUsage;
  };
  projects: ResourceUsage & {
    customCode: boolean;
    download: boolean;
    export: boolean;
  };
  custom_domains: ResourceUsage;
  uploads: {
    used: number;
    total: number;
  };
}

export function useAccountUsage() {
  return useQuery({
    queryKey: ['account-usage'],
    queryFn: () => fetchUsage(),
  });
}

export function reloadAccountUsage() {
  return queryClient.invalidateQueries({
    queryKey: ['account-usage'],
  });
}

function fetchUsage() {
  return apiClient
    .get<Response>(`account/usage`)
    .then(response => response.data);
}

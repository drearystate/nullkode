import {useMutation, useQueryClient} from '@tanstack/react-query';
import {UseFormReturn} from 'react-hook-form';
import {apiClient, queryClient} from '@common/http/query-client';
import {toast} from '@common/ui/toast/toast';
import {useTrans} from '@common/i18n/use-trans';
import {onFormQueryError} from '@common/errors/on-form-query-error';
import {message} from '@common/i18n/message';
import {BackendResponse} from '@common/http/backend-response/backend-response';
import {EditorProject} from '@app/dashboard/project';
import {getProductionHtml} from '@app/editor/utils/parse-html-into-document';
import {BLANK_PAGE_SKELETON} from '@app/projects/blank-page-skeleton';
import {BuilderTemplate} from '@app/templates/builder-template';
import {fetchTemplate} from '@app/templates/use-template';
import {reloadAccountUsage} from '@app/editor/use-account-usage';

interface Response extends BackendResponse {
  project: EditorProject;
}

export interface CreateProjectPayload {
  name: string;
  templateName?: string;
  userId?: string | number;
  published?: boolean;
}

export function useCreateProject(form: UseFormReturn<CreateProjectPayload>) {
  const {trans} = useTrans();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: async () => {
      reloadAccountUsage();
      await queryClient.invalidateQueries({queryKey: ['projects']});
      toast(trans(message('Site created')));
    },
    onError: err => onFormQueryError(err, form),
  });
}

async function createProject({
  name,
  templateName,
  userId,
  published,
}: CreateProjectPayload) {
  const payload: {
    name: string;
    pages?: {html: string}[];
    templateName?: string;
    userId?: string | number;
    published?: boolean;
  } = {
    name,
    templateName,
    pages: [],
    userId,
    published,
  };
  if (templateName) {
    try {
      const response = await queryClient.fetchQuery({
        queryKey: ['templates', templateName, true],
        queryFn: () => fetchTemplate(templateName, true),
      });
      payload.pages = payloadForTemplate(response.template);
    } catch (err) {
      return Promise.reject(err);
    }
  } else {
    payload.pages = pagesForBlankProject();
  }
  return apiClient.post<Response>('projects', payload).then(r => r.data);
}

function pagesForBlankProject() {
  return [
    {
      name: 'index',
      html: getProductionHtml(BLANK_PAGE_SKELETON),
    },
  ];
}

function payloadForTemplate(template: BuilderTemplate) {
  return template.pages.map(page => ({
    name: page.name,
    html: getProductionHtml(page.html, template),
  }));
}

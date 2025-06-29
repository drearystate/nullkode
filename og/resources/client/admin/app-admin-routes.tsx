import {RouteObject} from 'react-router-dom';
import {ProjectsDatatablePage} from '@app/admin/projects-datatable-page/projects-datatable-page';
import {TemplatesDatatablePage} from '@app/admin/templates-datatable-page/templates-datatable-page';
import {DomainsDatatablePage} from '@app/admin/custom-domains-datatable-page';

export const AppAdminRoutes: RouteObject[] = [
  {
    path: 'projects',
    element: <ProjectsDatatablePage />,
  },
  {
    path: 'templates',
    element: <TemplatesDatatablePage />,
  },
  {
    path: 'custom-domains',
    element: <DomainsDatatablePage />,
  },
];

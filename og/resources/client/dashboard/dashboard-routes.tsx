import {Outlet, RouteObject, useRoutes} from 'react-router-dom';
import React from 'react';
import {NotFoundPage} from '@common/ui/not-found-page/not-found-page';
import {DashboardPage} from '@app/dashboard/dashboard-page';
import {NewProjectPage} from '@app/dashboard/new-project-page';
import {CustomDomainsPage} from '@app/dashboard/custom-domains-page';
import {TemplatePreviewPage} from '@app/dashboard/template-preview-page';
import {ActiveWorkspaceProvider} from '@common/workspace/active-workspace-id-context';

export default function DashboardRoutes() {
  const DashboardRouteConfig: RouteObject[] = [
    {
      path: '',
      element: (
        <ActiveWorkspaceProvider>
          <Outlet />
        </ActiveWorkspaceProvider>
      ),
      children: [
        {
          path: '/',
          element: <DashboardPage />,
        },
        {
          path: '/domains',
          element: <CustomDomainsPage />,
        },
        {
          path: '/templates',
          element: <NewProjectPage />,
        },
        {
          path: '/templates/:name',
          element: <TemplatePreviewPage />,
        },
        {path: '*', element: <NotFoundPage />},
      ],
    },
  ];

  return useRoutes(DashboardRouteConfig);
}

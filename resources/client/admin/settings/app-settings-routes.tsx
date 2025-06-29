import {RouteObject} from 'react-router-dom';
import {EditorSettings} from '@app/admin/settings/editor-settings';

export const AppSettingsRoutes: RouteObject[] = [
  {path: 'editor', element: <EditorSettings />},
];

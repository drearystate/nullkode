import {MenuConfig} from '../core/settings/settings';
import {useAuth} from '../auth/use-auth';
import {useSettings} from '../core/settings/use-settings';
import dot from 'dot-object';
import {useMemo} from 'react';

export function useCustomMenu(menuOrPosition?: string | MenuConfig) {
  const settings = useSettings();
  const {user, hasPermission} = useAuth();

  return useMemo(() => {
    if (!menuOrPosition) {
      return null;
    }

    const menu =
      typeof menuOrPosition === 'string'
        ? settings.menus?.find(s => s.positions?.includes(menuOrPosition))
        : menuOrPosition;

    if (menu) {
      menu.items = menu.items.filter(item => {
        const hasRoles = (item.roles || []).every(
          a => user?.roles.find(b => b.id === a),
        );
        const hasPermissions = (item.permissions || []).every(a =>
          hasPermission(a),
        );
        const hasSettings =
          !item.settings ||
          Object.entries(item.settings).every(([key, value]) => {
            return dot.pick(key, settings) == value;
          });

        // make sure item has action, otherwise router link will error out
        return item.action && hasRoles && hasPermissions && hasSettings;
      });
    }

    return menu;
  }, [hasPermission, settings, menuOrPosition, user]);
}

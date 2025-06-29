import {Navbar} from '@common/ui/navigation/navbar/navbar';
import React from 'react';
import {Button} from '@common/ui/buttons/button';
import {Trans} from '@common/i18n/trans';
import {Link} from 'react-router-dom';
import {useSettings} from '@common/core/settings/use-settings';

export function DashboardNavbar() {
  const {billing} = useSettings();
  return (
    <Navbar
      menuPosition="dashboard"
      className="flex-shrink-0"
      rightChildren={
        billing.enable ? (
          <Button
            variant="outline"
            size="xs"
            color="primary"
            elementType={Link}
            to="/pricing"
          >
            <Trans message="Upgrade" />
          </Button>
        ) : undefined
      }
    />
  );
}

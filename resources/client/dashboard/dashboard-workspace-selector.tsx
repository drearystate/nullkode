import {useActiveWorkspace} from '@common/workspace/active-workspace-id-context';
import {WorkspaceSelector} from '@common/workspace/workspace-selector';
import {Button} from '@common/ui/buttons/button';
import {UnfoldMoreIcon} from '@common/icons/material/UnfoldMore';
import {Trans} from '@common/i18n/trans';
import React from 'react';
import {Workspace} from '@common/workspace/types/workspace';
import {Skeleton} from '@common/ui/skeleton/skeleton';
import {reloadAccountUsage} from '@app/editor/use-account-usage';

interface Props {
  className?: string;
}
export function DashboardWorkspaceSelector({className}: Props) {
  const workspace = useActiveWorkspace();
  return (
    <div className={className}>
      <WorkspaceSelector
        onChange={() => reloadAccountUsage()}
        placement="bottom"
        trigger={
          <Button
            variant="outline"
            className="min-w-[188px]"
            justify="justify-between"
            endIcon={<UnfoldMoreIcon />}
          >
            <Label workspace={workspace} />
          </Button>
        }
      />
    </div>
  );
}

interface LabelProps {
  workspace?: Workspace | null;
}
function Label({workspace}: LabelProps) {
  if (!workspace) {
    return <Skeleton />;
  }

  if (workspace.default) {
    return <Trans message="Default workspace" />;
  }

  return workspace.name;
}

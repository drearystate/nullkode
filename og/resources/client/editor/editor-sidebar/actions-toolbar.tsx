import {IconButton} from '@common/ui/buttons/icon-button';
import {Tooltip} from '@common/ui/tooltip/tooltip';
import {Trans} from '@common/i18n/trans';
import {UndoIcon} from '@common/icons/material/Undo';
import {RedoIcon} from '@common/icons/material/Redo';
import {Button} from '@common/ui/buttons/button';
import {VisibilityIcon} from '@common/icons/material/Visibility';
import {ReactElement} from 'react';
import {useSaveEditorProject} from '@app/editor/use-save-editor-project';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';
import {ScreenBreakpointSelector} from '@app/editor/editor-sidebar/breakpoint-selector/screen-breakpoint-selector';
import {ButtonBaseProps} from '@common/ui/buttons/button-base';
import {Link} from 'react-router-dom';
import {getProjectPreviewUrl} from '@app/projects/project-link';
import {Project} from '@app/dashboard/project';
import {
  mutationState,
  useMutationStore,
} from '@app/editor/state/mutation-store';

interface Props {
  project: Project;
}
export function ActionsToolbar({project}: Props) {
  const canUndo = useMutationStore(s => s.canUndo);
  const canRedo = useMutationStore(s => s.canRedo);
  return (
    <div className="relative z-10 flex h-40 flex-shrink-0 items-center justify-between border-t text-muted">
      <ToolbarIconButton
        label={<Trans message="Undo" />}
        onClick={() => mutationState().undo()}
        disabled={!canUndo}
      >
        <UndoIcon />
      </ToolbarIconButton>
      <ToolbarIconButton
        label={<Trans message="Redo" />}
        onClick={() => mutationState().redo()}
        disabled={!canRedo}
      >
        <RedoIcon />
      </ToolbarIconButton>
      <ScreenBreakpointSelector />
      <ToolbarIconButton
        label={<Trans message="Preview" />}
        elementType={Link}
        to={getProjectPreviewUrl(project)}
        target="_blank"
      >
        <VisibilityIcon />
      </ToolbarIconButton>
      <SaveButton />
    </div>
  );
}

function SaveButton() {
  const saveProject = useSaveEditorProject({updateThumbnail: true});
  const isDirty = useMutationStore(s => s.isDirty);
  return (
    <Button
      variant="flat"
      color="primary"
      className="min-h-full min-w-90"
      size="xs"
      radius="rounded-none"
      disabled={saveProject.isPending || !isDirty}
      onClick={() => {
        saveProject.mutate(undefined, {
          onSuccess: () => toast(message('Project saved')),
        });
      }}
    >
      <Trans message="Save" />
    </Button>
  );
}

interface ToolbarIconButtonProps extends ButtonBaseProps {
  children: ReactElement;
  label: ReactElement;
}
function ToolbarIconButton({
  children,
  label,
  ...buttonProps
}: ToolbarIconButtonProps) {
  return (
    <Tooltip label={label}>
      <IconButton
        variant="outline"
        size={null}
        className="h-full flex-auto"
        border="border-r"
        radius="rounded-none"
        {...buttonProps}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

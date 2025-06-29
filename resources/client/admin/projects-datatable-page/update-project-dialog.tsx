import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useForm} from 'react-hook-form';
import {Form} from '@common/ui/forms/form';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {
  UpdateProjectPayload,
  useUpdateProject,
} from '@app/admin/projects-datatable-page/use-update-project';
import {Project} from '@app/dashboard/project';
import {CrupdateProjectFields} from '@app/admin/projects-datatable-page/crupdate-project-fields';

interface Props {
  project: Project;
}
export function UpdateProjectDialog({project}: Props) {
  const {formId, close} = useDialogContext();
  const form = useForm<UpdateProjectPayload>({
    defaultValues: {
      name: project.name,
      userId: project.user_id,
      published: project.published,
      templateName: project.template,
    },
  });
  const updateProject = useUpdateProject(project.id, form);
  return (
    <Dialog>
      <DialogHeader>
        <Trans message="Update project" />
      </DialogHeader>
      <DialogBody>
        <Form
          id={formId}
          form={form}
          onSubmit={value => {
            updateProject.mutate(value, {
              onSuccess: () => close(),
            });
          }}
        >
          <CrupdateProjectFields />
        </Form>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => close()}>
          <Trans message="Cancel" />
        </Button>
        <Button
          form={formId}
          type="submit"
          variant="flat"
          color="primary"
          disabled={updateProject.isPending}
        >
          <Trans message="Update" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

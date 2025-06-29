import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useForm} from 'react-hook-form';
import {
  CreateProjectPayload,
  useCreateProject,
} from '@app/projects/use-create-project';
import {Form} from '@common/ui/forms/form';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {useAuth} from '@common/auth/use-auth';
import {CrupdateProjectFields} from '@app/admin/projects-datatable-page/crupdate-project-fields';

export function CreateProjectDialog() {
  const {formId, close} = useDialogContext();
  const {user} = useAuth();
  const form = useForm<CreateProjectPayload>({
    defaultValues: {
      userId: user?.id,
      published: true,
    },
  });
  const createProject = useCreateProject(form);
  return (
    <Dialog>
      <DialogHeader>
        <Trans message="New project" />
      </DialogHeader>
      <DialogBody>
        <Form
          id={formId}
          form={form}
          onSubmit={value => {
            createProject.mutate(value, {
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
          disabled={createProject.isPending}
        >
          <Trans message="Create" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

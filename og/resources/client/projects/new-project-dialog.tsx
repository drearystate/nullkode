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
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {useNavigate} from '@common/utils/hooks/use-navigate';

interface Props {
  templateName?: string;
}
export function NewProjectDialog({templateName}: Props) {
  const {formId, close} = useDialogContext();
  const navigate = useNavigate();
  const form = useForm<CreateProjectPayload>({
    defaultValues: {
      templateName,
    },
  });
  const createProject = useCreateProject(form);
  return (
    <Dialog>
      <DialogHeader>
        <Trans message="Create new site" />
      </DialogHeader>
      <DialogBody>
        <Form
          form={form}
          id={formId}
          onSubmit={values =>
            createProject.mutate(values, {
              onSuccess: response => {
                close();
                navigate(`/editor/${response.project.model.id}`, {
                  replace: true,
                });
              },
            })
          }
        >
          <FormTextField
            name="name"
            label={<Trans message="Name" />}
            autoFocus
            required
          />
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

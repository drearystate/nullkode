import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useForm} from 'react-hook-form';
import {Form} from '@common/ui/forms/form';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {BuilderTemplate} from '@app/templates/builder-template';
import {
  UpdateTemplatePayload,
  useUpdateTemplate,
} from '@app/admin/templates-datatable-page/use-update-template';
import {CrupdateTemplateFields} from '@app/admin/templates-datatable-page/crupdate-template-fields';

interface Props {
  template: BuilderTemplate;
}
export function UpdateTemplateDialog({template}: Props) {
  const {formId, close} = useDialogContext();
  const form = useForm<UpdateTemplatePayload>({
    defaultValues: {
      name: template.name,
      category: template.config.category,
      includeBootstrap: template.config.includeBootstrap,
    },
  });
  const updateTemplate = useUpdateTemplate(template.name, form);
  return (
    <Dialog>
      <DialogHeader>
        <Trans message="Update template" />
      </DialogHeader>
      <DialogBody>
        <Form
          id={formId}
          form={form}
          onSubmit={value => {
            updateTemplate.mutate(value, {
              onSuccess: () => close(),
            });
          }}
        >
          <CrupdateTemplateFields />
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
          disabled={updateTemplate.isPending}
        >
          <Trans message="Update" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

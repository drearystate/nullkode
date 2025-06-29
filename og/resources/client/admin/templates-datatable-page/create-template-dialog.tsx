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
  CreateTemplatePayload,
  useCreateTemplate,
} from '@app/admin/templates-datatable-page/use-create-template';
import React from 'react';
import {CrupdateTemplateFields} from '@app/admin/templates-datatable-page/crupdate-template-fields';

export function CreateTemplateDialog() {
  const {formId, close} = useDialogContext();
  const form = useForm<CreateTemplatePayload>({
    defaultValues: {
      category: 'Landing Page',
    },
  });
  const createTemplate = useCreateTemplate(form);
  return (
    <Dialog>
      <DialogHeader>
        <Trans message="New template" />
      </DialogHeader>
      <DialogBody>
        <Form
          id={formId}
          form={form}
          onSubmit={value => {
            createTemplate.mutate(value, {
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
          disabled={createTemplate.isPending}
        >
          <Trans message="Create" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

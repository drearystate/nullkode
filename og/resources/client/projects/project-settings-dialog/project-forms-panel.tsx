import {Project} from '@app/dashboard/project';
import {Trans} from '@common/i18n/trans';
import {SectionHelper} from '@common/ui/section-helper';
import {Form} from '@common/ui/forms/form';
import {useForm} from 'react-hook-form';
import {
  ProjectSettingsPayload,
  useUpdateProjectSettings,
} from '@app/projects/use-update-project-settings';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';
import {Button} from '@common/ui/buttons/button';

interface Props {
  project: Project;
}
export function ProjectFormsPanel({project}: Props) {
  const form = useForm<ProjectSettingsPayload>({
    defaultValues: {
      formsEmail: project.settings?.formsEmail,
    },
  });
  const updateSettings = useUpdateProjectSettings(project.id, form);
  return (
    <div className="mb-8">
      <SectionHelper
        className="mb-18"
        description={
          <Trans message="When a form is submitted on your published site, submitted data will be collected and sent to this email address." />
        }
        color="neutral"
      />
      <Form
        form={form}
        onSubmit={data => {
          updateSettings.mutate(data, {
            onSuccess: () => toast(message('Forms email updated')),
          });
        }}
      >
        <FormTextField
          name="formsEmail"
          type="email"
          label={<Trans message="Send form submissions to" />}
          description={
            <Trans message="If left empty, will default to your account's primary email address." />
          }
        />
        <div className="mt-14">
          <Button
            variant="flat"
            color="primary"
            type="submit"
            disabled={updateSettings.isPending || !form.formState.isDirty}
          >
            <Trans message="Save" />
          </Button>
        </div>
      </Form>
    </div>
  );
}

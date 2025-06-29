import {Button} from '@common/ui/buttons/button';
import {Trans} from '@common/i18n/trans';
import {useSettings} from '@common/core/settings/use-settings';
import {FtpCredentials, Project} from '@app/dashboard/project';
import {SectionHelper} from '@common/ui/section-helper';
import {Link} from 'react-router-dom';
import {LinkStyle} from '@common/ui/buttons/external-link';
import {DownloadIcon} from '@common/icons/material/Download';
import {Form} from '@common/ui/forms/form';
import {useForm} from 'react-hook-form';
import {FormSwitch} from '@common/ui/forms/toggle/switch';
import {useExportProjectToFtp} from '@app/projects/use-export-project-to-ftp';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Fragment, ReactNode} from 'react';
import {InfoDialogTrigger} from '@common/ui/overlays/dialog/info-dialog-trigger/info-dialog-trigger';
import {useAccountUsage} from '@app/editor/use-account-usage';

interface Props {
  project: Project;
}
export function ExportProjectPanel({project}: Props) {
  const {base_url} = useSettings();
  const {data: usage} = useAccountUsage();
  return (
    <div>
      <div className="mb-14 border-b pb-20">
        <SectionTitle>
          <Trans message="Export your site as a zip file" />
        </SectionTitle>
        {usage?.projects.download === false && <NoDownloadPermissionMessage />}
        <Button
          variant="outline"
          size="xs"
          elementType="a"
          download
          color="primary"
          href={`${base_url}/api/v1/projects/${project.id}/download`}
          startIcon={<DownloadIcon />}
          disabled={!usage?.projects.download}
        >
          <Trans message="Download zip file" />
        </Button>
      </div>
      <div>
        <SectionTitle>
          <Trans message="Export to your own FTP server" />
        </SectionTitle>
        {usage?.projects.export === false && <NoExportPermissionMessage />}
        <FtpForm project={project} disabled={!usage?.projects.export} />
      </div>
    </div>
  );
}

interface SectionTitleProps {
  children: ReactNode;
}
function SectionTitle({children}: SectionTitleProps) {
  return <div className="mb-10 text-sm font-semibold">{children}</div>;
}

interface FtpFormProps {
  project: Project;
  disabled: boolean;
}

function FtpForm({project, disabled}: FtpFormProps) {
  const {publish} = useSettings();
  const canEnterFtpCredentials = publish?.allow_credential_change ?? false;
  const defaultValues = project.settings?.ftpCredentials?.host
    ? {...project.settings.ftpCredentials}
    : {...publish?.default_credentials};
  if (!defaultValues.directory) {
    defaultValues.directory = project.slug;
  }
  const form = useForm<FtpCredentials>({
    defaultValues,
  });
  const exportProject = useExportProjectToFtp(project.id, form);
  return (
    <Form
      form={form}
      onSubmit={data => {
        exportProject.mutate(data, {
          onSuccess: () => {
            toast(message('Project exported'));
          },
        });
      }}
    >
      {canEnterFtpCredentials && (
        <Fragment>
          <FormTextField
            name="host"
            label={<Trans message="Host" />}
            required
            size="sm"
            className="mb-14"
          />
          <div className="mb-14 flex gap-10">
            <FormTextField
              name="username"
              label={<Trans message="Username" />}
              required
              size="sm"
              className="flex-1"
            />
            <FormTextField
              name="password"
              type="password"
              label={<Trans message="Password" />}
              required
              size="sm"
              className="flex-1"
            />
          </div>
          <div className="mb-14 flex gap-10">
            <FormTextField
              name="directory"
              label={
                <Fragment>
                  <Trans message="Directory" />
                  <InfoDialogTrigger
                    body={
                      <Trans message="In which directory on your FTP server should site files be stored. Leave empty to store at root." />
                    }
                  />
                </Fragment>
              }
              size="sm"
              className="flex-1"
            />
            <FormTextField
              name="port"
              type="number"
              min={1}
              label={
                <div className="min-h-24">
                  <Trans message="Port" />
                </div>
              }
              placeholder="21"
              className="flex-1"
              size="sm"
            />
          </div>
          <FormSwitch name="ssl" className="mb-10">
            <Trans message="Use SSL" />
          </FormSwitch>
          <FormSwitch name="rememberCredentials">
            <Trans message="Remember credentials" />
          </FormSwitch>
        </Fragment>
      )}
      <div className="mt-28">
        <Button
          variant="flat"
          color="primary"
          type="submit"
          disabled={disabled || exportProject.isPending}
        >
          <Trans message="Export" />
        </Button>
      </div>
    </Form>
  );
}

function NoDownloadPermissionMessage() {
  return (
    <SectionHelper
      className="mb-14"
      color="bgAlt"
      size="sm"
      description={
        <Trans
          message="To download your site as a zip file <a>upgrade your plan.</a>"
          values={{
            a: text => (
              <Link className={LinkStyle} to="/pricing">
                {text}
              </Link>
            ),
          }}
        />
      }
    />
  );
}

function NoExportPermissionMessage() {
  return (
    <SectionHelper
      className="mb-14"
      color="bgAlt"
      size="sm"
      description={
        <Trans
          message="To export your site via FTP or as a .zip file <a>upgrade your plan.</a>"
          values={{
            a: text => (
              <Link className={LinkStyle} to="/pricing">
                {text}
              </Link>
            ),
          }}
        />
      }
    />
  );
}

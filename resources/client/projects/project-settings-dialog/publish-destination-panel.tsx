import {Project} from '@app/dashboard/project';
import {useSettings} from '@common/core/settings/use-settings';
import {Trans} from '@common/i18n/trans';
import {
  getProjectPreviewUrl,
  getProjectSubdomainUrl,
} from '@app/projects/project-link';
import {Fragment, ReactNode} from 'react';
import {useCustomDomains} from '@common/custom-domains/use-custom-domains';
import {useAuth} from '@common/auth/use-auth';
import {Button} from '@common/ui/buttons/button';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {ConnectDomainDialog} from '@common/custom-domains/datatable/connect-domain-dialog/connect-domain-dialog';
import {Select} from '@common/ui/forms/select/select';
import {removeProtocol} from '@common/utils/urls/remove-protocol';
import {Item} from '@common/ui/forms/listbox/item';
import {ProgressCircle} from '@common/ui/progress/progress-circle';
import {PolicyFailMessage} from '@common/billing/upgrade/policy-fail-message';
import {useTrans} from '@common/i18n/use-trans';
import {message} from '@common/i18n/message';
import {useUpdateProjectSettings} from '@app/projects/use-update-project-settings';
import {toast} from '@common/ui/toast/toast';
import {useAccountUsage} from '@app/editor/use-account-usage';

interface Props {
  project: Project;
}
export function PublishDestinationPanel({project}: Props) {
  const {builder} = useSettings();
  return (
    <div className="mb-8 mt-18">
      <SectionLayout title={<Trans message="Preview url" />}>
        <DestinationLink href={getProjectPreviewUrl(project)}>
          {getProjectPreviewUrl(project, {removeProtocol: true})}
        </DestinationLink>
      </SectionLayout>
      {builder?.enable_subdomains && (
        <SectionLayout
          className="mt-8 border-t pt-8"
          title={<Trans message="Free subdomain" />}
        >
          <DestinationLink href={getProjectSubdomainUrl(project)}>
            {getProjectSubdomainUrl(project, {removeProtocol: true})}
          </DestinationLink>
        </SectionLayout>
      )}
      {builder?.enable_custom_domains && (
        <CustomDomainSection project={project} />
      )}
    </div>
  );
}

interface CustomDomainSectionProps {
  project: Project;
}
function CustomDomainSection({project}: CustomDomainSectionProps) {
  const {trans} = useTrans();
  const {user} = useAuth();
  const updateProject = useUpdateProjectSettings(project.id);
  const {data, isLoading} = useCustomDomains({userId: user!.id});
  const domains = data?.pagination.data || [];
  const {data: usage} = useAccountUsage();

  const handleDomainChange = (domainId: number | null) => {
    if (domainId === project.domain?.id) return;
    updateProject.mutate(
      {domainId},
      {
        onSuccess: () => toast(message('Domain changed')),
      },
    );
  };

  let content = null;

  if (!data && isLoading) {
    content = <ProgressCircle size="sm" isIndeterminate />;
  } else {
    content = (
      <Fragment>
        {!!domains.length && (
          <Select
            selectionMode="single"
            size="sm"
            className="mb-14"
            placeholder={trans(message('Select a domain...'))}
            disabled={updateProject.isPending}
            selectedValue={project.domain?.id ?? null}
            onItemSelected={domainId => {
              handleDomainChange(domainId as number);
            }}
          >
            <Item value={null}>
              <Trans message="No custom domain" />
            </Item>
            {domains.map(domain => (
              <Item value={domain.id} key={domain.id}>
                {removeProtocol(domain.host)}
              </Item>
            ))}
          </Select>
        )}
        {usage?.custom_domains.create.allowed === false ? (
          <PolicyFailMessage
            size="sm"
            resourceName={<Trans message="custom domains" />}
          />
        ) : (
          <DialogTrigger type="modal">
            <Button variant="outline" color="primary" size="xs">
              <Trans message="Connect domain" />
            </Button>
            <ConnectDomainDialog />
          </DialogTrigger>
        )}
      </Fragment>
    );
  }

  return (
    <SectionLayout
      className="mt-8 border-t pt-8"
      title={<Trans message="Branded domain" />}
      description={
        <Trans message="Select your own custom domain at which this site should be accessible." />
      }
    >
      <div className="mt-10">{content}</div>
    </SectionLayout>
  );
}

interface SectionLayoutProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}
function SectionLayout({
  title,
  description,
  children,
  className,
}: SectionLayoutProps) {
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-medium">{title}</div>
      {!!description && <div className="text-xs text-muted">{description}</div>}
      {children}
    </div>
  );
}

interface DestinationLinkProps {
  href: string;
  children: ReactNode;
}
function DestinationLink({href, children}: DestinationLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      className="text-xs text-primary hover:underline"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

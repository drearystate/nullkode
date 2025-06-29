import {Trans} from '@common/i18n/trans';
import {Footer} from '@common/ui/footer/footer';
import React from 'react';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {Button} from '@common/ui/buttons/button';
import {AddIcon} from '@common/icons/material/Add';
import {ConnectDomainDialog} from '@common/custom-domains/datatable/connect-domain-dialog/connect-domain-dialog';
import {useCustomDomains} from '@common/custom-domains/use-custom-domains';
import {useAuth} from '@common/auth/use-auth';
import {IllustratedMessage} from '@common/ui/images/illustrated-message';
import {SvgImage} from '@common/ui/images/svg-image/svg-image';
import worldImage from '@common/custom-domains/datatable/world.svg';
import {PageStatus} from '@common/http/page-status';
import {CustomDomain} from '@common/custom-domains/custom-domain';
import {removeProtocol} from '@common/utils/urls/remove-protocol';
import {ConfirmationDialog} from '@common/ui/overlays/dialog/confirmation-dialog';
import {useDeleteDomain} from '@common/custom-domains/datatable/requests/use-delete-domain';
import {Menu, MenuTrigger} from '@common/ui/navigation/menu/menu-trigger';
import {useProjects} from '@app/dashboard/use-projects';
import {Item} from '@common/ui/forms/listbox/item';
import {getProjectImageUrl} from '@app/projects/project-link';
import {KeyboardArrowDownIcon} from '@common/icons/material/KeyboardArrowDown';
import {useUpdateDomain} from '@common/custom-domains/datatable/requests/use-update-domain';
import {Project} from '@app/dashboard/project';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';
import {useTrans} from '@common/i18n/use-trans';
import {DashboardNavbar} from '@app/dashboard/dashboard-navbar';
import {DashboardWorkspaceSelector} from '@app/dashboard/dashboard-workspace-selector';
import {useActiveWorkspaceId} from '@common/workspace/active-workspace-id-context';
import {reloadAccountUsage} from '@app/editor/use-account-usage';
import {StaticPageTitle} from '@common/seo/static-page-title';

export function CustomDomainsPage() {
  return (
    <div className="flex h-screen flex-col">
      <StaticPageTitle>
        <Trans message="Branded domains" />
      </StaticPageTitle>
      <DashboardNavbar />
      <div className="container mx-auto mt-40 flex-auto px-20">
        <div>
          <div className="flex items-center gap-14">
            <h1 className="mr-auto text-3xl font-medium">
              <Trans message="Branded domains" />
            </h1>
            <DashboardWorkspaceSelector />
          </div>
          <p className="text-muted">
            <Trans message="Connect and manage your own custom domains." />
          </p>
        </div>
        <Content />
      </div>
      <Footer className="px-40" />
    </div>
  );
}

function Content() {
  const {user} = useAuth();
  const {workspaceId} = useActiveWorkspaceId();
  const query = useCustomDomains<Project>({
    userId: user!.id,
    perPage: 40,
    with: 'resource.user',
    workspaceId,
  });
  const showNoResultsMessage = query.data?.pagination.data.length === 0;
  return (
    <div className="mt-20 flex-auto">
      <DialogTrigger
        type="modal"
        onClose={newDomain => {
          if (newDomain) {
            reloadAccountUsage();
          }
        }}
      >
        <Button
          variant="outline"
          color="primary"
          startIcon={<AddIcon />}
          size="xs"
        >
          <Trans message="Connect domain" />
        </Button>
        <ConnectDomainDialog />
      </DialogTrigger>
      <div className="mt-34">
        {showNoResultsMessage && <NoDomainsMessage />}
        {query.data ? (
          <DomainList domains={query.data.pagination.data} />
        ) : (
          <PageStatus query={query} loaderIsScreen={false} />
        )}
      </div>
    </div>
  );
}

interface DomainListProps {
  domains: CustomDomain<Project>[];
}
function DomainList({domains}: DomainListProps) {
  return (
    <div>
      {domains.map(domain => (
        <div key={domain.id} className="rounded-panel border p-16">
          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap font-bold">
            {removeProtocol(domain.host)}
          </div>
          <div className="mb-20 text-sm text-muted">
            {domain.resource ? (
              <div className="mt-4 flex items-center gap-8">
                <img
                  className="h-24 w-24 rounded object-cover"
                  src={getProjectImageUrl(domain.resource)}
                  alt=""
                />
                <div>{domain.resource?.name}</div>
              </div>
            ) : (
              <Trans message="This domain is not connected to any project yet." />
            )}
          </div>
          <div className="flex items-center gap-10">
            <ProjectSelectorButton domain={domain} />
            <RemoveDomainButton domain={domain} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProjectSelectorButtonProps {
  domain: CustomDomain<Project>;
}
function ProjectSelectorButton({domain}: ProjectSelectorButtonProps) {
  const {trans} = useTrans();
  const {user} = useAuth();
  const {items} = useProjects({userId: user!.id, published: 'true'});
  const updateDomain = useUpdateDomain();

  const handleDomainChange = (projectId: number | null) => {
    const projectName = items.find(p => p.id === projectId)?.name;
    if (projectId) {
      toast.positive(
        trans(
          message('Connected “:domain” to  “:name”', {
            values: {
              domain: removeProtocol(domain.host),
              name: projectName,
            },
          }),
        ),
      );
    }
  };

  return (
    <MenuTrigger
      selectionMode="single"
      selectedValue={domain.resource?.id ?? ''}
      onItemSelected={projectId => {
        updateDomain.mutate(
          {
            domainId: domain.id,
            resource_id: projectId ? (projectId as number) : null,
            resource_type: projectId ? 'project' : null,
          },
          {
            onSuccess: () => handleDomainChange(projectId as number),
          },
        );
      }}
    >
      <Button
        variant="outline"
        size="xs"
        endIcon={<KeyboardArrowDownIcon />}
        disabled={updateDomain.isPending}
      >
        <Trans message="Change project" />
      </Button>
      <Menu>
        <Item value="">
          <Trans message="No project" />
        </Item>
        {items.map(project => (
          <Item
            value={project.id}
            key={project.id}
            startIcon={
              <img
                className="h-24 w-24 object-cover"
                src={getProjectImageUrl(project)}
                alt=""
              />
            }
          >
            {project.name}
          </Item>
        ))}
      </Menu>
    </MenuTrigger>
  );
}

interface RemoveDomainButtonProps {
  domain: CustomDomain;
}
function RemoveDomainButton({domain}: RemoveDomainButtonProps) {
  const deleteDomain = useDeleteDomain();
  return (
    <DialogTrigger type="modal">
      <Button variant="outline" size="xs" color="danger">
        <Trans message="Remove" />
      </Button>
      <ConfirmationDialog
        isDanger
        isLoading={deleteDomain.isPending}
        title={<Trans message="Remove domain?" />}
        body={<Trans message="Are you sure you want to remove this domain?" />}
        confirm={<Trans message="Remove" />}
        onConfirm={() => {
          deleteDomain.mutate(
            {domain},
            {onSuccess: () => reloadAccountUsage()},
          );
        }}
      />
    </DialogTrigger>
  );
}

function NoDomainsMessage() {
  return (
    <IllustratedMessage
      title={<Trans message="No domains" />}
      description={<Trans message="You have not connected any domains yet" />}
      image={<SvgImage src={worldImage} />}
    />
  );
}

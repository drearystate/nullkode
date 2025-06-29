import {useProjects} from '@app/dashboard/use-projects';
import {useAuth} from '@common/auth/use-auth';
import {
  getProjectImageUrl,
  getProjectPreviewUrl,
  ProjectLink,
} from '@app/projects/project-link';
import {FormattedRelativeTime} from '@common/i18n/formatted-relative-time';
import {IconButton} from '@common/ui/buttons/icon-button';
import {MoreVertIcon} from '@common/icons/material/MoreVert';
import {InfiniteScrollSentinel} from '@common/ui/infinite-scroll/infinite-scroll-sentinel';
import {Button} from '@common/ui/buttons/button';
import {Trans} from '@common/i18n/trans';
import {KeyboardArrowRightIcon} from '@common/icons/material/KeyboardArrowRight';
import {Link} from 'react-router-dom';
import {Menu, MenuTrigger} from '@common/ui/navigation/menu/menu-trigger';
import {Item} from '@common/ui/forms/listbox/item';
import {Project} from '@app/dashboard/project';
import {ConfirmationDialog} from '@common/ui/overlays/dialog/confirmation-dialog';
import React, {Fragment, ReactNode, useState} from 'react';
import {useDeleteProject} from '@app/projects/use-delete-project';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {openDialog} from '@common/ui/overlays/store/dialog-store';
import {ProjectSettingsDialog} from '@app/projects/project-settings-dialog/project-settings-dialog';
import {AddIcon} from '@common/icons/material/Add';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {useTrans} from '@common/i18n/use-trans';
import {message} from '@common/i18n/message';
import {SearchIcon} from '@common/icons/material/Search';
import {KeyboardArrowDownIcon} from '@common/icons/material/KeyboardArrowDown';
import {Footer} from '@common/ui/footer/footer';
import {Skeleton} from '@common/ui/skeleton/skeleton';
import {AnimatePresence, m} from 'framer-motion';
import {opacityAnimation} from '@common/ui/animation/opacity-animation';
import {IllustratedMessage} from '@common/ui/images/illustrated-message';
import {SvgImage} from '@common/ui/images/svg-image/svg-image';
import builderImage from '@app/templates/website-builder.svg';
import {DashboardNavbar} from './dashboard-navbar';
import {DashboardWorkspaceSelector} from '@app/dashboard/dashboard-workspace-selector';
import {PolicyFailMessage} from '@common/billing/upgrade/policy-fail-message';
import {useAccountUsage} from '@app/editor/use-account-usage';
import {AdHost} from '@common/admin/ads/ad-host';
import {StaticPageTitle} from '@common/seo/static-page-title';

const SortOptions = [
  {value: 'created_at|desc', label: message('Date created')},
  {value: 'name|asc', label: message('Alphabetical')},
  {value: 'updated_at|desc', label: message('Last updated')},
];

export function DashboardPage() {
  const {data: usage} = useAccountUsage();
  const {trans} = useTrans();
  const {user} = useAuth();
  const query = useProjects({userId: user!.id, paginate: 'lengthAware'});
  const {sortDescriptor, setSortDescriptor, searchQuery, setSearchQuery} =
    query;
  const sortValue = `${sortDescriptor.orderBy}|${sortDescriptor.orderDir}`;

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="Dashboard" />
      </StaticPageTitle>
      <div className="flex h-screen flex-col overflow-y-scroll">
        <DashboardNavbar />
        <div className="container mx-auto flex-auto px-12">
          {usage?.projects.create.allowed === false && (
            <PolicyFailMessage
              className="mt-24 text-center"
              resourceName={<Trans message="sites" />}
            />
          )}
          <div className="flex items-center gap-12 py-36">
            <DashboardWorkspaceSelector className="mr-auto" />
            <TextField
              size="sm"
              placeholder={trans(message('Search sites...'))}
              startAdornment={<SearchIcon />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <MenuTrigger
              selectionMode="single"
              selectedValue={sortValue}
              onItemSelected={newValue => {
                const [orderBy, orderDir] = (newValue as string).split('|');
                setSortDescriptor({
                  orderBy,
                  orderDir: orderDir as 'asc' | 'desc',
                });
              }}
            >
              <Button
                size="sm"
                variant="outline"
                endIcon={<KeyboardArrowDownIcon />}
              >
                {
                  <Trans
                    {...SortOptions.find(option => option.value === sortValue)!
                      .label}
                  />
                }
              </Button>
              <Menu>
                {SortOptions.map(option => (
                  <Item key={option.value} value={option.value}>
                    <Trans {...option.label} />
                  </Item>
                ))}
              </Menu>
            </MenuTrigger>
            <Button
              size="sm"
              variant="flat"
              color="primary"
              elementType={Link}
              to="templates"
              startIcon={<AddIcon />}
              disabled={!usage?.projects.create.allowed}
            >
              <Trans message="New site" />
            </Button>
          </div>
          <AdHost slot="dashboard_top" className="mb-36" />
          <AnimatePresence initial={false} mode="wait">
            <ProjectGrid query={query} />
          </AnimatePresence>
          <AdHost slot="dashboard_bottom" className="mt-36" />
        </div>
        <Footer className="mt-40 px-40" />
      </div>
    </Fragment>
  );
}

interface ProjectGridProps {
  query: ReturnType<typeof useProjects>;
}

function ProjectGrid({query}: ProjectGridProps) {
  if (query.data) {
    if (query.noResults) {
      return <NoProjectsMessage isSearching={!!query.searchQuery} />;
    }
    return (
      <div>
        <GridLayout animationKey="projects">
          {query.items.map(project => (
            <div key={project.id} className="rounded-panel border shadow">
              <div className="group relative">
                <img
                  className="aspect-video w-full"
                  src={getProjectImageUrl(project)}
                  alt=""
                />
                <div className="absolute left-0 top-0 hidden h-full w-full items-center justify-center bg-white/70 group-hover:flex">
                  <Button
                    variant="flat"
                    color="primary"
                    endIcon={<KeyboardArrowRightIcon />}
                    elementType={Link}
                    to={`/editor/${project.id}`}
                  >
                    <Trans message="Open editor" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-6 p-20">
                <div className="flex-auto">
                  <div className="font-bold">{project.name}</div>
                  <div className="text-sm text-muted">
                    <ProjectLink project={project} />
                  </div>
                  <div className="mt-4 text-xs text-muted">
                    <FormattedRelativeTime date={project.updated_at} />
                  </div>
                </div>
                <OptionsTrigger project={project} />
              </div>
            </div>
          ))}
        </GridLayout>
        <InfiniteScrollSentinel query={query} />
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <GridLayout animationKey="skeletons">
        {[...Array(6)].map((_, index) => (
          <Skeleton key={index} variant="rect" size="h-[310px]" />
        ))}
      </GridLayout>
    );
  }

  return null;
}

interface GridLayoutProps {
  children: ReactNode;
  animationKey: string;
}

function GridLayout({children, animationKey}: GridLayoutProps) {
  return (
    <m.div
      key={animationKey}
      {...opacityAnimation}
      className="grid grid-cols-1 gap-12 md:grid-cols-3"
    >
      {children}
    </m.div>
  );
}

interface NoProjectsMessageProps {
  isSearching: boolean;
}
function NoProjectsMessage({isSearching}: NoProjectsMessageProps) {
  return (
    <IllustratedMessage
      className="mt-40"
      title={<Trans message="No sites" />}
      description={
        isSearching ? (
          <Trans message="No sites match your search query" />
        ) : (
          <Trans message="You have not created any sites yet" />
        )
      }
      image={<SvgImage src={builderImage} />}
    />
  );
}

interface OptionsTriggerProps {
  project: Project;
}
function OptionsTrigger({project}: OptionsTriggerProps) {
  const [deleteDialogIsOpen, setDeleteDialogIsOpen] = useState(false);

  return (
    <Fragment>
      <MenuTrigger>
        <IconButton className="text-muted">
          <MoreVertIcon />
        </IconButton>
        <Menu>
          <Item value="edit" elementType={Link} to={`/editor/${project.id}`}>
            <Trans message="Edit" />
          </Item>
          <Item
            value="preview"
            elementType={Link}
            target="_blank"
            to={getProjectPreviewUrl(project)}
          >
            <Trans message="Preview" />
          </Item>
          <Item
            value="settings"
            onSelected={() => openDialog(ProjectSettingsDialog, {project})}
          >
            <Trans message="Settings" />
          </Item>
          <Item value="delete" onSelected={() => setDeleteDialogIsOpen(true)}>
            <Trans message="Delete" />
          </Item>
        </Menu>
      </MenuTrigger>
      <DeleteProjectDialog
        isOpen={deleteDialogIsOpen}
        onClose={() => setDeleteDialogIsOpen(false)}
        projectId={project.id}
      />
    </Fragment>
  );
}

interface DeleteProjectProps {
  projectId: string | number;
  isOpen: boolean;
  onClose: () => void;
}
function DeleteProjectDialog({projectId, isOpen, onClose}: DeleteProjectProps) {
  const deleteProject = useDeleteProject();
  return (
    <DialogTrigger type="modal" isOpen={isOpen} onClose={onClose}>
      <ConfirmationDialog
        isDanger
        title={<Trans message="Delete project" />}
        body={<Trans message="Are you sure you want to delete this project?" />}
        confirm={<Trans message="Delete" />}
        isLoading={deleteProject.isPending}
        onConfirm={() => {
          deleteProject.mutate(
            {projectId},
            {
              onSuccess: () => {
                onClose();
              },
            },
          );
        }}
      />
    </DialogTrigger>
  );
}

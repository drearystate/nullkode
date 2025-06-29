import {ColumnConfig} from '@common/datatable/column-config';
import {Trans} from '@common/i18n/trans';
import {Link} from 'react-router-dom';
import {NameWithAvatar} from '@common/datatable/column-templates/name-with-avatar';
import {FormattedDate} from '@common/i18n/formatted-date';
import React, {Fragment} from 'react';
import {IconButton} from '@common/ui/buttons/icon-button';
import {EditIcon} from '@common/icons/material/Edit';
import {Tooltip} from '@common/ui/tooltip/tooltip';
import {Project} from '@app/dashboard/project';
import {
  getProjectImageUrl,
  getProjectPreviewUrl,
} from '@app/projects/project-link';
import {CheckIcon} from '@common/icons/material/Check';
import {CloseIcon} from '@common/icons/material/Close';
import {SettingsIcon} from '@common/icons/material/Settings';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {UpdateProjectDialog} from '@app/admin/projects-datatable-page/update-project-dialog';

export const ProjectsDatatableColumns: ColumnConfig<Project>[] = [
  {
    key: 'name',
    allowsSorting: true,
    width: 'flex-2 min-w-200',
    visibleInMode: 'all',
    header: () => <Trans message="Name" />,
    body: project => (
      <NameWithAvatar
        image={getProjectImageUrl(project)}
        label={
          <Link
            to={getProjectPreviewUrl(project)}
            target="_blank"
            className="hover:underline"
          >
            {project.name}
          </Link>
        }
      />
    ),
  },
  {
    key: 'user_id',
    allowsSorting: true,
    width: 'flex-2 min-w-140',
    header: () => <Trans message="Owner" />,
    body: project =>
      project.user && (
        <NameWithAvatar
          image={project.user.avatar}
          label={
            <Link
              className="hover:underline"
              target="_blank"
              to={`/admin/users/${project.user.id}/edit`}
            >
              {project.user.display_name}
            </Link>
          }
          description={project.user.email}
        />
      ),
  },
  {
    key: 'published',
    allowsSorting: true,
    header: () => <Trans message="Published" />,
    body: project =>
      project.published ? (
        <CheckIcon className="text-positive icon-md" />
      ) : (
        <CloseIcon className="text-danger icon-md" />
      ),
  },
  {
    key: 'template',
    allowsSorting: true,
    header: () => <Trans message="Template" />,
    body: project => project.template,
  },
  {
    key: 'updated_at',
    allowsSorting: true,
    width: 'w-100',
    header: () => <Trans message="Last updated" />,
    body: project => <FormattedDate date={project.updated_at} />,
  },
  {
    key: 'actions',
    header: () => <Trans message="Actions" />,
    hideHeader: true,
    align: 'end',
    width: 'w-84 flex-shrink-0',
    visibleInMode: 'all',
    body: project => (
      <Fragment>
        <Tooltip label={<Trans message="Edit project" />}>
          <IconButton
            className="text-muted"
            elementType={Link}
            to={`/editor/${project.id}`}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
        <DialogTrigger type="modal">
          <Tooltip label={<Trans message="Project settings" />}>
            <IconButton className="text-muted">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <UpdateProjectDialog project={project} />
        </DialogTrigger>
      </Fragment>
    ),
  },
];

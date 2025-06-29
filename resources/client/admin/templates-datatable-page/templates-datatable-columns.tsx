import {ColumnConfig} from '@common/datatable/column-config';
import {Trans} from '@common/i18n/trans';
import {NameWithAvatar} from '@common/datatable/column-templates/name-with-avatar';
import {FormattedDate} from '@common/i18n/formatted-date';
import React from 'react';
import {IconButton} from '@common/ui/buttons/icon-button';
import {EditIcon} from '@common/icons/material/Edit';
import {Tooltip} from '@common/ui/tooltip/tooltip';
import {BuilderTemplate} from '@app/templates/builder-template';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {UpdateTemplateDialog} from '@app/admin/templates-datatable-page/update-template-dialog';

export const TemplatesDatatableColumns: ColumnConfig<BuilderTemplate>[] = [
  {
    key: 'name',
    allowsSorting: true,
    width: 'flex-2 min-w-200',
    visibleInMode: 'all',
    header: () => <Trans message="Name" />,
    body: template => (
      <NameWithAvatar image={template.thumbnail} label={template.name} />
    ),
  },
  {
    key: 'category',
    allowsSorting: true,
    header: () => <Trans message="Category" />,
    body: template => template.config.category,
  },
  {
    key: 'updated_at',
    allowsSorting: true,
    width: 'w-100',
    header: () => <Trans message="Last updated" />,
    body: template => <FormattedDate date={template.updated_at} />,
  },
  {
    key: 'actions',
    header: () => <Trans message="Actions" />,
    hideHeader: true,
    align: 'end',
    width: 'w-42 flex-shrink-0',
    visibleInMode: 'all',
    body: template => (
      <DialogTrigger type="modal">
        <Tooltip label={<Trans message="Edit template" />}>
          <IconButton className="text-muted">
            <EditIcon />
          </IconButton>
        </Tooltip>
        <UpdateTemplateDialog template={template} />
      </DialogTrigger>
    ),
  },
];

import {Trans} from '@common/i18n/trans';
import React from 'react';
import {DataTablePage} from '@common/datatable/page/data-table-page';
import {DataTableAddItemButton} from '@common/datatable/data-table-add-item-button';
import {DeleteSelectedItemsAction} from '@common/datatable/page/delete-selected-items-action';
import {DataTableEmptyStateMessage} from '@common/datatable/page/data-table-emty-state-message';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {ProjectsDatatableColumns} from '@app/admin/projects-datatable-page/projects-datatable-columns';
import builderImage from '@app/templates/website-builder.svg';
import {CreateProjectDialog} from '@app/admin/projects-datatable-page/create-project-dialog';
import {ProjectsDatatableFilters} from '@app/admin/projects-datatable-page/projects-datatable-filters';

export function ProjectsDatatablePage() {
  return (
    <DataTablePage
      endpoint="projects"
      title={<Trans message="Projects" />}
      filters={ProjectsDatatableFilters}
      columns={ProjectsDatatableColumns}
      actions={<Actions />}
      selectedActions={<DeleteSelectedItemsAction />}
      emptyStateMessage={
        <DataTableEmptyStateMessage
          image={builderImage}
          title={<Trans message="No projects have been created yet" />}
          filteringTitle={<Trans message="No matching projects" />}
        />
      }
    />
  );
}

function Actions() {
  return (
    <DialogTrigger type="modal">
      <DataTableAddItemButton>
        <Trans message="New project" />
      </DataTableAddItemButton>
      <CreateProjectDialog />
    </DialogTrigger>
  );
}

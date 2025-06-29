import {Trans} from '@common/i18n/trans';
import React from 'react';
import {DataTablePage} from '@common/datatable/page/data-table-page';
import {DataTableAddItemButton} from '@common/datatable/data-table-add-item-button';
import {DeleteSelectedItemsAction} from '@common/datatable/page/delete-selected-items-action';
import {DataTableEmptyStateMessage} from '@common/datatable/page/data-table-emty-state-message';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import builderImage from '@app/templates/website-builder.svg';
import {TemplatesDatatableColumns} from '@app/admin/templates-datatable-page/templates-datatable-columns';
import {CreateTemplateDialog} from '@app/admin/templates-datatable-page/create-template-dialog';

export function TemplatesDatatablePage() {
  return (
    <DataTablePage
      endpoint="templates"
      title={<Trans message="Templates" />}
      columns={TemplatesDatatableColumns}
      actions={<Actions />}
      selectedActions={<DeleteSelectedItemsAction />}
      emptyStateMessage={
        <DataTableEmptyStateMessage
          image={builderImage}
          title={<Trans message="No templates have been created yet" />}
          filteringTitle={<Trans message="No matching templates" />}
        />
      }
    />
  );
}

function Actions() {
  return (
    <DialogTrigger type="modal">
      <DataTableAddItemButton>
        <Trans message="New template" />
      </DataTableAddItemButton>
      <CreateTemplateDialog />
    </DialogTrigger>
  );
}

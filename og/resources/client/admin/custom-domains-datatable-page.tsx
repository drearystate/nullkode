import {DataTablePage} from '@common/datatable/page/data-table-page';
import {Trans} from '@common/i18n/trans';
import React from 'react';
import {DomainsEmptyStateMessage} from '@common/custom-domains/datatable/domains-empty-state-message';
import {domainsDatatableColumns} from '@common/custom-domains/datatable/domains-datatable-columns';
import {DomainsDatatableFilters} from '@common/custom-domains/datatable/domains-datatable-filters';
import {DataTableAddItemButton} from '@common/datatable/data-table-add-item-button';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {ConnectDomainDialog} from '@common/custom-domains/datatable/connect-domain-dialog/connect-domain-dialog';

export function DomainsDatatablePage() {
  return (
    <DataTablePage
      enableSelection={false}
      endpoint="custom-domain"
      queryParams={{with: 'user'}}
      title={<Trans message="Branded domains" />}
      filters={DomainsDatatableFilters}
      columns={domainsDatatableColumns}
      actions={<Actions />}
      emptyStateMessage={<DomainsEmptyStateMessage />}
    />
  );
}

function Actions() {
  return (
    <DialogTrigger type="modal">
      <DataTableAddItemButton>
        <Trans message="Connect domain" />
      </DataTableAddItemButton>
      <ConnectDomainDialog showGlobalField />
    </DialogTrigger>
  );
}

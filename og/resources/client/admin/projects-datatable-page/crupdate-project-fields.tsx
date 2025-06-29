import {Fragment} from 'react';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Trans} from '@common/i18n/trans';
import {FormNormalizedModelField} from '@common/ui/forms/normalized-model-field';
import {FormSelect} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {FormSwitch} from '@common/ui/forms/toggle/switch';
import {useTemplates} from '@app/templates/use-templates';

export function CrupdateProjectFields() {
  const {items} = useTemplates({});
  return (
    <Fragment>
      <FormTextField
        autoFocus
        name="name"
        label={<Trans message="Name" />}
        className="mb-14"
        required
      />
      <FormNormalizedModelField
        name="userId"
        className="mb-14"
        endpoint="normalized-models/user"
        label={<Trans message="User" />}
        required
      />
      <FormSelect
        name="templateName"
        selectionMode="single"
        label={<Trans message="Template" />}
        className="mb-14"
      >
        <Item value={null}>
          <Trans message="No template" />
        </Item>
        {items.map(template => (
          <Item value={template.name} key={template.name} capitalizeFirst>
            {template.name}
          </Item>
        ))}
      </FormSelect>
      <FormSwitch name="published">
        <Trans message="Published" />
      </FormSwitch>
    </Fragment>
  );
}

import React, {Fragment} from 'react';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Trans} from '@common/i18n/trans';
import {FormSelect} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {FormSwitch} from '@common/ui/forms/toggle/switch';
import {FormFileField} from '@common/ui/forms/input-field/file-field';
import {useSettings} from '@common/core/settings/use-settings';
import {useFormContext} from 'react-hook-form';

export function CrupdateTemplateFields() {
  const {builder} = useSettings();
  const form = useFormContext();
  return (
    <Fragment>
      <FormTextField
        autoFocus
        name="name"
        label={<Trans message="Name" />}
        className="mb-20"
        required
      />
      <FormSelect
        selectionMode="single"
        name="category"
        label={<Trans message="Category" />}
        className="mb-20"
      >
        <Item value="">
          <Trans message="All categories" />
        </Item>
        {builder?.template_categories?.map(category => (
          <Item key={category} value={category}>
            <Trans message={category} />
          </Item>
        ))}
      </FormSelect>
      <FormFileField
        required
        onChange={() => form.clearErrors()}
        name="template"
        label={<Trans message="Template zip file" />}
        accept=".zip"
        className="mb-20"
        description={
          <p>
            <Trans message="Zip of template files. Must contain index.html file which will be used as default page." />
            <br />
            <br />
            <Trans message="(Optional) CSS and JS that should appear in builder code editors should be in 'css/code_editor_styles.css' and 'js/code_editor_scripts.js' files." />
          </p>
        }
      />
      <FormFileField
        required
        onChange={() => form.clearErrors()}
        name="thumbnail"
        label={<Trans message="Thumbnail" />}
        className="mb-20"
        accept="image/*"
      />
      <FormSwitch
        name="includeBootstrap"
        description={
          <Trans message="Deselect if template already includes bootstrap files, otherwise styles will be duplicated which might cause issues." />
        }
      >
        <Trans message="Include bootstrap" />
      </FormSwitch>
    </Fragment>
  );
}

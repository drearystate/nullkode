import {Fragment} from 'react';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Trans} from '@common/i18n/trans';

interface Props {
  isIndexPage?: boolean;
}
export function CrupdatePageFormFields({isIndexPage}: Props) {
  return (
    <Fragment>
      <FormTextField
        size="xs"
        name="name"
        required
        label={<Trans message="Name" />}
        autoFocus
        className="mb-14"
        disabled={isIndexPage}
      />
      <FormTextField
        size="xs"
        name="title"
        label={<Trans message="Title" />}
        className="mb-14"
      />
      <FormTextField
        size="xs"
        name="description"
        label={<Trans message="Description" />}
        inputElementType="textarea"
        rows={1}
        className="mb-14"
      />
      <FormTextField
        size="xs"
        name="keywords"
        label={<Trans message="Keywords" />}
        inputElementType="textarea"
        description={<Trans message="Separate each keyword with a comma." />}
        rows={1}
      />
    </Fragment>
  );
}

import {Fragment} from 'react';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {FormSelect} from '@common/ui/forms/select/select';
import {FormSwitch} from '@common/ui/forms/toggle/switch';
import {Item} from '@common/ui/forms/listbox/item';
import {Trans} from '@common/i18n/trans';
import {LockIcon} from '@common/icons/material/Lock';
import {PublicIcon} from '@common/icons/material/Public';
import {AdminPanelSettingsIcon} from '@common/icons/material/AdminPanelSettings';
import {Accordion, AccordionItem} from '@common/ui/accordion/accordion';

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
        className="mb-14"
      />

      <Accordion mode="single" className="mb-14">
        <AccordionItem label={
          <div className="flex items-center gap-8">
            <LockIcon size="sm" />
            <Trans message="Access Control" />
          </div>
        }>
          <div className="space-y-12 pt-12">
            <FormSelect
              size="xs"
              name="accessLevel"
              label={<Trans message="Page Access Level" />}
              description={<Trans message="Control who can view this page" />}
              defaultValue="public"
              selectionMode="single"
            >
              <Item value="public">
                <div className="flex items-center gap-8">
                  <PublicIcon size="sm" />
                  <div>
                    <div className="font-medium"><Trans message="Public" /></div>
                    <div className="text-xs text-muted"><Trans message="Anyone can view this page" /></div>
                  </div>
                </div>
              </Item>
              <Item value="user">
                <div className="flex items-center gap-8">
                  <LockIcon size="sm" />
                  <div>
                    <div className="font-medium"><Trans message="Authenticated Users" /></div>
                    <div className="text-xs text-muted"><Trans message="Only logged-in users can view" /></div>
                  </div>
                </div>
              </Item>
              <Item value="admin">
                <div className="flex items-center gap-8">
                  <AdminPanelSettingsIcon size="sm" />
                  <div>
                    <div className="font-medium"><Trans message="Administrators" /></div>
                    <div className="text-xs text-muted"><Trans message="Only admins can view this page" /></div>
                  </div>
                </div>
              </Item>
            </FormSelect>

            <FormSwitch
              name="requiresAuth"
              description={<Trans message="Redirect unauthenticated users to login page" />}
            >
              <Trans message="Require Authentication" />
            </FormSwitch>

            <FormTextField
              size="xs"
              name="allowedRoles"
              label={<Trans message="Allowed Roles (Optional)" />}
              description={<Trans message="Comma-separated list of custom roles that can access this page" />}
              placeholder="editor, moderator, premium"
            />
          </div>
        </AccordionItem>
      </Accordion>
    </Fragment>
  );
}

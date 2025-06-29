import {SettingsPanel} from '@common/admin/settings/settings-panel';
import {Trans} from '@common/i18n/trans';
import {Tabs} from '@common/ui/tabs/tabs';
import {TabList} from '@common/ui/tabs/tab-list';
import {Tab} from '@common/ui/tabs/tab';
import {TabPanel, TabPanels} from '@common/ui/tabs/tab-panels';
import {Fragment} from 'react';
import {FormSwitch} from '@common/ui/forms/toggle/switch';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {LearnMoreLink} from '@common/admin/settings/learn-more-link';
import {JsonChipField} from '@common/admin/settings/json-chip-field';
import {message} from '@common/i18n/message';
import {useTrans} from '@common/i18n/use-trans';
import {SettingsSeparator} from '@common/admin/settings/settings-separator';

export function EditorSettings() {
  return (
    <SettingsPanel
      title={<Trans message="Editor" />}
      description={
        <Trans message="Configure the site editor and user dashboard settings." />
      }
    >
      <Tabs isLazy>
        <TabList>
          <Tab>
            <Trans message="General" />
          </Tab>
          <Tab>
            <Trans message="Exporting" />
          </Tab>
        </TabList>
        <TabPanels className="mt-24">
          <TabPanel>
            <GeneralPanel />
          </TabPanel>
          <TabPanel>
            <ExportingPanel />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </SettingsPanel>
  );
}

function GeneralPanel() {
  const {trans} = useTrans();
  return (
    <Fragment>
      <FormSwitch
        className="mb-24"
        name="client.builder.enable_subdomains"
        description={
          <div>
            <Trans message="Should user projects be accessible via subdomain on your site." />
            <LearnMoreLink
              className="mt-6"
              link="https://support.vebto.com/hc/articles/5/9/156/custom-domains#sub-domain"
            />
          </div>
        }
      >
        <Trans message="Subdomains" />
      </FormSwitch>
      <FormSwitch
        className="mb-24"
        name="client.builder.enable_custom_domains"
        description={
          <div>
            <Trans message="Should users be able to connect their own custom domains. This can also be controlled via permissions." />
            <LearnMoreLink
              className="mt-6"
              link="https://support.vebto.com/hc/articles/5/9/156/custom-domains#custom-domains"
            />
          </div>
        }
      >
        <Trans message="Custom domains" />
      </FormSwitch>
      <FormTextField
        name="server.openai_api_key"
        className="mb-24"
        label={<Trans message="OpenAI API key" />}
        description={
          <Trans message="Used for various AI powered functionality in site editor." />
        }
      />
      <JsonChipField
        name="client.builder.template_categories"
        label={<Trans message="Template Categories" />}
        placeholder={trans(message('Add category...'))}
        description={
          <Trans message="Used for filtering templates on new site page in user dashboard." />
        }
      />
    </Fragment>
  );
}

function ExportingPanel() {
  return (
    <Fragment>
      <FormSwitch
        className="mb-24"
        name="client.publish.allow_credential_change"
        description={
          <Trans message="Whether users should be able to enter their own FTP credentials when exorting their site. If disabled, credentials provided below will be used when exporting site via FTP." />
        }
      >
        <Trans message="Allow custom FTP credentials" />
      </FormSwitch>
      <SettingsSeparator />
      <div className="mb-14 text-sm font-semibold">
        <Trans message="Default FTP credentials for site exporting" />
      </div>

      <FormTextField
        name="client.publish.default_credentials.host"
        label={<Trans message="Host" />}
        required
        size="sm"
        className="mb-14"
      />
      <FormTextField
        name="client.publish.default_credentials.username"
        label={<Trans message="Username" />}
        required
        size="sm"
        className="mb-14"
      />
      <FormTextField
        name="client.publish.default_credentials.password"
        type="password"
        label={<Trans message="Password" />}
        required
        size="sm"
        className="mb-14"
      />
      <FormTextField
        name="client.publish.default_credentials.directory"
        label={<Trans message="Directory" />}
        size="sm"
        className="mb-14"
        description={
          <Trans message="In which directory on your FTP server should site files be stored. Leave empty to store at root." />
        }
      />
      <FormTextField
        name="client.publish.default_credentials.port"
        type="number"
        min={1}
        label={<Trans message="Port" />}
        placeholder="21"
        className="mb-14"
        size="sm"
      />
      <FormSwitch
        name="client.publish.default_credentials.ssl"
        className="mb-10"
      >
        <Trans message="Use SSL" />
      </FormSwitch>
    </Fragment>
  );
}

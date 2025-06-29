import {LinkEditorValue} from '@app/editor/link-editor-dialog/link-editor-value';
import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {useForm} from 'react-hook-form';
import {Button} from '@common/ui/buttons/button';
import {Form} from '@common/ui/forms/form';
import {
  FormRadioGroup,
  RadioGroup,
} from '@common/ui/forms/radio-group/radio-group';
import {FormRadio, Radio} from '@common/ui/forms/radio-group/radio';
import {useState} from 'react';
import {message} from '@common/i18n/message';
import {FormTextField} from '@common/ui/forms/input-field/text-field/text-field';
import {useTrans} from '@common/i18n/use-trans';
import {IllustratedMessage} from '@common/ui/images/illustrated-message';
import {LinkOffIcon} from '@common/icons/material/LinkOff';
import {FormSelect} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {BuilderPageWithId} from '@app/dashboard/project';

type Tab = 'none' | 'url' | 'page' | 'anchor' | 'download' | 'email';

const Tabs = [
  {value: 'none', label: message('Unlink')},
  {value: 'url', label: message('Url')},
  {value: 'page', label: message('Page')},
  {value: 'anchor', label: message('Anchor')},
  {value: 'download', label: message('Download')},
  {value: 'email', label: message('Email')},
];

interface Props {
  value: LinkEditorValue;
  hideUnlinkPanel?: boolean;
}
export function LinkEditorDialog({value, hideUnlinkPanel}: Props) {
  const {close, formId} = useDialogContext();
  const project = useEditorStore(s => s.project);

  const [initialTab] = useState<Tab>(() => {
    if (!value?.href) {
      return 'url';
    } else if (!value.href.startsWith('http') && value.href.endsWith('.html')) {
      return 'page';
    } else if (value.href.startsWith('#')) {
      return 'anchor';
    } else if (value.href.startsWith('mailto:')) {
      return 'email';
    } else if (!!value.download) {
      return 'download';
    } else {
      return 'url';
    }
  });

  const [pageAnchors] = useState(() => {
    return Array.from(
      editorState().getEditorDoc().querySelectorAll('*[id]'),
    ).map(el => el.id);
  });
  const projectPages = project?.pages ?? [];

  const [selectedTab, setSelectedTab] = useState<Tab>(initialTab);

  return (
    <Dialog size="lg">
      <DialogHeader>
        <Trans message="What do you want to link to?" />
      </DialogHeader>
      <DialogBody>
        <div className="flex min-h-180 items-stretch">
          <RadioGroup orientation="vertical" size="sm">
            {Tabs.map(tab => {
              if (tab.value === 'none' && hideUnlinkPanel) {
                return null;
              }
              return (
                <Radio
                  key={tab.value}
                  value={tab.value}
                  checked={selectedTab === tab.value}
                  onChange={() => setSelectedTab(tab.value as Tab)}
                >
                  <Trans {...tab.label} />
                </Radio>
              );
            })}
          </RadioGroup>
          <div className="ml-24 flex-auto border-l pl-24">
            {selectedTab === 'none' && <UnlinkTab />}
            {selectedTab === 'url' && <UrlTab value={value} />}
            {selectedTab === 'page' && !!projectPages.length && (
              <PageTab value={value} pages={projectPages} />
            )}
            {selectedTab === 'anchor' && !!pageAnchors.length && (
              <AnchorTab value={value} anchors={pageAnchors} />
            )}
            {selectedTab === 'download' && <DownloadTab value={value} />}
            {selectedTab === 'email' && <EmailTab value={value} />}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => close()}>
          <Trans message="Cancel" />
        </Button>
        <Button variant="flat" color="primary" type="submit" form={formId}>
          <Trans message="Done" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

interface TabProps {
  value?: LinkEditorValue;
}
function UnlinkTab() {
  const {close, formId} = useDialogContext();
  const form = useForm();
  return (
    <Form form={form} id={formId} onSubmit={() => close('unlink')}>
      <IllustratedMessage
        imageMargin="mb-10"
        imageHeight="h-auto"
        image={<LinkOffIcon className="text-muted" size="xl" />}
        title={<Trans message="Unlink" />}
        description={<Trans message="Remove current link from the selection" />}
      />
    </Form>
  );
}

function UrlTab({value}: TabProps) {
  const {trans} = useTrans();
  const {close, formId} = useDialogContext();
  const form = useForm({
    defaultValues: {
      href: value?.href,
      target: value?.target ?? '_self',
    },
  });
  return (
    <Form form={form} id={formId} onSubmit={value => close(value)}>
      <FormTextField
        name="href"
        label={<Trans message="What's the web address (URL)?" />}
        placeholder={trans(message('Paste it here…'))}
        type="url"
        required
        autoFocus
      />
      <LinkTargetSelector />
    </Form>
  );
}

interface PageTabProps extends TabProps {
  pages: BuilderPageWithId[];
}
function PageTab({value, pages}: PageTabProps) {
  const {trans} = useTrans();
  const {close, formId} = useDialogContext();
  const form = useForm({
    defaultValues: {
      href: value?.href ?? `${pages?.[0].name}.html`,
      target: value?.target ?? '_self',
    },
  });
  return (
    <Form form={form} id={formId} onSubmit={value => close(value)}>
      <FormSelect
        name="href"
        label={<Trans message="Which page?" />}
        placeholder={trans(message('Select a page...'))}
        selectionMode="single"
        required
        autoFocus
      >
        {pages?.map(page => (
          <Item key={page.id} value={`${page.name}.html`}>
            {page.name}
          </Item>
        ))}
      </FormSelect>
      <LinkTargetSelector />
    </Form>
  );
}

interface AnchorTabProps extends TabProps {
  anchors: string[];
}
function AnchorTab({value, anchors}: AnchorTabProps) {
  const {trans} = useTrans();
  const {close, formId} = useDialogContext();
  const form = useForm({
    defaultValues: {
      href: value?.href ?? `#${anchors[0]}`,
    },
  });
  return (
    <Form form={form} id={formId} onSubmit={value => close(value)}>
      <FormSelect
        name="href"
        label={<Trans message="Which anchor on this page?" />}
        placeholder={trans(message('Select an anchor...'))}
        selectionMode="single"
        description={
          <Trans message="Click on this element will scroll to the selected anchor on the page." />
        }
        autoFocus
        required
      >
        {anchors.map(anchor => (
          <Item key={anchor} value={`#${anchor}`}>
            {anchor}
          </Item>
        ))}
      </FormSelect>
    </Form>
  );
}

function DownloadTab({value}: TabProps) {
  const {close, formId} = useDialogContext();
  const form = useForm({
    defaultValues: {
      href: value?.href,
      download: value?.download,
    },
  });
  return (
    <Form form={form} id={formId} onSubmit={value => close(value)}>
      <FormTextField
        name="download"
        label={<Trans message="Download file name" />}
        required
        className="mb-24"
        autoFocus
      />
      <FormTextField
        name="href"
        label={<Trans message="Download url" />}
        required
        type="url"
      />
    </Form>
  );
}

function EmailTab({value}: TabProps) {
  const {close, formId} = useDialogContext();
  const defaultValues = {
    subject: '',
    email: '',
  };
  if (value?.href) {
    const href = new URL(value.href);
    defaultValues.subject = href.searchParams.get('subject') ?? '';
    defaultValues.email = href.pathname.replace('mailto:', '');
  }
  const form = useForm({
    defaultValues,
  });
  return (
    <Form
      form={form}
      id={formId}
      onSubmit={value =>
        close({
          href: `mailto:${value.email}?subject=${value.subject}`,
        })
      }
    >
      <FormTextField
        name="email"
        label={<Trans message="Email address" />}
        required
        type="email"
        className="mb-24"
        autoFocus
      />
      <FormTextField
        name="subject"
        label={<Trans message="Email subject" />}
        required
      />
    </Form>
  );
}

function LinkTargetSelector() {
  return (
    <div className="mt-16 border-t pt-16">
      <FormRadioGroup
        name="target"
        orientation="vertical"
        size="sm"
        label={<Trans message="How should it open?" />}
      >
        <FormRadio value="_blank">
          <Trans message="New window" />
        </FormRadio>
        <FormRadio value="_self">
          <Trans message="Same window" />
        </FormRadio>
      </FormRadioGroup>
    </div>
  );
}

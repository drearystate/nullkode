import {useSettings} from '@common/core/settings/use-settings';
import {Link, useParams} from 'react-router-dom';
import {Button} from '@common/ui/buttons/button';
import {Trans} from '@common/i18n/trans';
import {KeyboardBackspaceIcon} from '@common/icons/material/KeyboardBackspace';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {IconButton} from '@common/ui/buttons/icon-button';
import {PhoneIphoneIcon} from '@common/icons/material/PhoneIphone';
import {DesktopMacIcon} from '@common/icons/material/DesktopMac';
import {useState} from 'react';
import clsx from 'clsx';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {NewProjectDialog} from '@app/projects/new-project-dialog';
import {useTemplate} from '@app/templates/use-template';
import {BuilderTemplate} from '@app/templates/builder-template';
import {FullPageLoader} from '@common/ui/progress/full-page-loader';

export function TemplatePreviewPage() {
  const {base_url} = useSettings();
  const {name} = useParams();
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<
    'mobile' | 'desktop'
  >('desktop');
  const {data} = useTemplate(name!);

  return (
    <div className="flex h-screen w-screen flex-col">
      <Header
        selectedBreakpoint={selectedBreakpoint}
        onBreakpointChange={setSelectedBreakpoint}
        template={data?.template}
      />
      <div
        className={clsx(
          'flex flex-auto items-center justify-center',
          selectedBreakpoint === 'mobile' && 'my-40',
        )}
      >
        {data?.template ? (
          <iframe
            className={clsx(
              'transition-size',
              selectedBreakpoint === 'mobile'
                ? 'h-[844px] w-[390px] overflow-hidden rounded-[64px] border-[12px] border-[#444546] shadow-lg'
                : 'h-full w-full',
            )}
            src={`${base_url}/templates/preview/${data.template.name}`}
          />
        ) : (
          <FullPageLoader />
        )}
      </div>
    </div>
  );
}

interface HeaderProps {
  selectedBreakpoint: 'mobile' | 'desktop';
  onBreakpointChange: (breakpoint: 'mobile' | 'desktop') => void;
  template: BuilderTemplate | undefined;
}
function Header({
  selectedBreakpoint,
  onBreakpointChange,
  template,
}: HeaderProps) {
  return (
    <header className="flex min-w-0 items-center gap-12 overflow-hidden bg px-12 py-16 shadow-[0,2px,18px,0,rgba(129,162,182,.2)] md:px-32">
      <Logo color="bg" logoColor="dark" className="max-md:hidden" />
      <Button
        startIcon={<KeyboardBackspaceIcon />}
        elementType={Link}
        to="/dashboard/templates"
      >
        <Trans message="Back to templates" />
      </Button>
      <IconButton
        className="ml-auto max-md:hidden"
        color={selectedBreakpoint === 'mobile' ? 'primary' : undefined}
        onClick={() => onBreakpointChange('mobile')}
      >
        <PhoneIphoneIcon />
      </IconButton>
      <IconButton
        className="max-md:hidden"
        color={selectedBreakpoint === 'desktop' ? 'primary' : undefined}
        onClick={() => onBreakpointChange('desktop')}
      >
        <DesktopMacIcon />
      </IconButton>
      <DialogTrigger type="modal">
        <Button
          variant="flat"
          color="primary"
          className="ml-auto"
          disabled={!template}
        >
          <Trans message="Use this template" />
        </Button>
        <NewProjectDialog templateName={template?.name} />
      </DialogTrigger>
    </header>
  );
}

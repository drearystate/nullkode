import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {BackgroundSelector} from '@common/background-selector/background-selector';

export function BackgroundSelectorDialog() {
  const {close, value, setValue, initialValue} = useDialogContext<
    BackgroundSelectorConfig | undefined
  >();

  return (
    <Dialog size="lg">
      <DialogHeader>
        <Trans message="Select a background" />
      </DialogHeader>
      <DialogBody>
        <BackgroundSelector
          value={value}
          onChange={value => setValue(value)}
          isInsideDialog
          tabColWidth="grid-cols-[repeat(auto-fill,minmax(80px,1fr))]"
          positionSelector="advanced"
          diskPrefix="project-assets"
        />
      </DialogBody>
      <DialogFooter dividerTop>
        <Button onClick={() => close(initialValue)}>
          <Trans message="Cancel" />
        </Button>
        <Button variant="flat" color="primary" onClick={() => close(value)}>
          <Trans message="Apply" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

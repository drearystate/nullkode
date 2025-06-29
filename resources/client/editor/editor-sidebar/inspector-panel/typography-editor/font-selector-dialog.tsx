import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {FontSelector} from '@common/ui/font-selector/font-selector';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {FontConfig} from '@common/http/value-lists';

interface Props {
  value: FontConfig;
}
export function FontSelectorDialog({value}: Props) {
  const {close} = useDialogContext();
  return (
    <Dialog size="xl">
      <DialogHeader>
        <Trans message="Select font" />
      </DialogHeader>
      <DialogBody className="@container">
        <FontSelector value={value} onChange={value => close(value)} />
      </DialogBody>
    </Dialog>
  );
}

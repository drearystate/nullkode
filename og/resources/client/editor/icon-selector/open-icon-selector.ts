import {openDialog} from '@common/ui/overlays/store/dialog-store';
import {IconSelectorDialog} from '@app/editor/icon-selector/icon-selector-dialog';

export async function openIconSelector(): Promise<string | null> {
  return await openDialog(IconSelectorDialog);
}

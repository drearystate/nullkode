import {openDialog} from '@common/ui/overlays/store/dialog-store';
import {LinkEditorDialog} from '@app/editor/link-editor-dialog/link-editor-dialog';
import {LinkEditorValue} from '@app/editor/link-editor-dialog/link-editor-value';

export async function openLinkEditor(
  value: LinkEditorValue | null,
  options: {hideUnlinkPanel?: boolean} = {},
): Promise<LinkEditorValue | 'unlink' | undefined> {
  return await openDialog(LinkEditorDialog, {
    ...options,
    value,
  });
}

import {ElementContextData} from '@app/editor/elements/element-context-data';
import {aiActionButtonHandlers} from '@app/editor/editor-sidebar/inspector-panel/ai-action-buttons';
import {openDialog} from '@common/ui/overlays/store/dialog-store';
import {GenerateTextWithAiDialog} from '@app/editor/ai/text/generate-text-with-ai-dialog';
import {GenerateImageWithAiDialog} from '@app/editor/ai/image/generate-image-with-ai-dialog';

export async function executePrimaryContextAction(
  ctx: ElementContextData | undefined | null,
) {
  if (!ctx?.el?.editActions?.[0]) return;

  const action = ctx.el.editActions[0].action;

  if (action === 'aiCreateText') {
    const value = await openDialog(GenerateTextWithAiDialog);
    if (value) {
      aiActionButtonHandlers.replaceTextAction(value);
    }
    return;
  }
  if (action === 'aiEditText') {
    const value = await openDialog(GenerateTextWithAiDialog, {
      initialScreen: () => ({
        name: 'refine',
        originalText: ctx.node.textContent,
      }),
    });
    if (value) {
      aiActionButtonHandlers.replaceTextAction(value);
    }
    return;
  }
  if (action === 'aiCreateImage') {
    const value = await openDialog(GenerateImageWithAiDialog);
    if (value) {
      aiActionButtonHandlers.replaceImageSrcAction(value);
    }
    return;
  }

  action(ctx.node);
}

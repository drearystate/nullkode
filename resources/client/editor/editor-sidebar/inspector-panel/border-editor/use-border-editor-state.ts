import {editorState} from '@app/editor/state/editor-store';
import {spacingStyleToShortHand} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import {inspectorState} from '@app/editor/state/inspector-store';
import {SetBorder} from '@app/editor/mutations/style/border/set-border';
import {
  ExecuteMutationOptions,
  mutationState,
} from '@app/editor/state/mutation-store';

interface ApplyOptions extends ExecuteMutationOptions {
  forceMinimumWidth?: boolean;
}

function applyBorderValue(options: ApplyOptions) {
  const node = editorState().selectedContext?.node;
  const currentWidth = spacingStyleToShortHand(
    inspectorState().currentConfig.borderWidth,
  );
  if (!node) return;
  if (options.forceMinimumWidth && currentWidth === '0px 0px 0px 0px') {
    inspectorState().setValue('borderWidth', [
      [1, 'px'],
      [1, 'px'],
      [1, 'px'],
      [1, 'px'],
    ]);
  }

  const value = getCurrentBorderValue();
  mutationState().executeMutation(
    new SetBorder(
      {
        ...value,
        borderRadius: spacingStyleToShortHand(value.borderRadius),
        borderWidth: spacingStyleToShortHand(value.borderWidth),
      },
      node,
    ),
    options,
  );
}

function getCurrentBorderValue() {
  return {
    borderWidth: inspectorState().currentConfig.borderWidth,
    borderColor: inspectorState().currentConfig.borderColor,
    borderStyle: inspectorState().currentConfig.borderStyle,
    borderRadius: inspectorState().currentConfig.borderRadius,
  };
}

export function useBorderEditorState() {
  return {
    applyValue: applyBorderValue,
    getCurrentValue: getCurrentBorderValue,
  };
}

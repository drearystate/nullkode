import {SpacingEditor} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/spacing-editor';
import {useSpacingEditorState} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import {SetPadding} from '@app/editor/mutations/style/spacing/set-padding';
import {mutationState} from '@app/editor/state/mutation-store';

export function PaddingEditor() {
  const state = useSpacingEditorState({
    name: 'padding',
    onMutate: (value, node, options) => {
      mutationState().executeMutation(new SetPadding(value, node), options);
    },
  });
  return <SpacingEditor state={state} />;
}

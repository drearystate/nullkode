import {SpacingEditor} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/spacing-editor';
import {useSpacingEditorState} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import {SetMargin} from '@app/editor/mutations/style/spacing/set-margin';
import {mutationState} from '@app/editor/state/mutation-store';

export function MarginEditor() {
  const state = useSpacingEditorState({
    name: 'margin',
    onMutate: (value, node, options) => {
      mutationState().executeMutation(new SetMargin(value, node), options);
    },
  });
  return <SpacingEditor state={state} />;
}

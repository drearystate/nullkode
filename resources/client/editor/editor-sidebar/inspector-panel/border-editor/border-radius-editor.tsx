import {SpacingEditor} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/spacing-editor';
import {useSpacingEditorState} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import {useBorderEditorState} from '@app/editor/editor-sidebar/inspector-panel/border-editor/use-border-editor-state';

export function BorderRadiusEditor() {
  const borderEditorState = useBorderEditorState();
  const spacingEditorState = useSpacingEditorState({
    name: 'borderRadius',
    onMutate: (value, node, options) => {
      borderEditorState.applyValue({
        ...options,
      });
    },
  });
  return <SpacingEditor state={spacingEditorState} />;
}

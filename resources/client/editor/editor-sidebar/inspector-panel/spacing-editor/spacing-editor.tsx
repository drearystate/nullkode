import {Slider} from '@common/ui/forms/slider/slider';
import {SpacingEditorStateReturn} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import {ReactNode} from 'react';
import {SpacingEditorInputs} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/spacing-editor-inputs';
import {SpacingEditorCheckbox} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/spacing-editor-checkbox';

interface Props {
  state: SpacingEditorStateReturn;
  children?: ReactNode;
}
export function SpacingEditor({state, children}: Props) {
  return (
    <div>
      <div className="flex items-center gap-6">
        <SpacingEditorCheckbox
          className="mr-auto"
          valueIndex="all"
          state={state}
        />
        <SpacingEditorCheckbox valueIndex={0} state={state} />
        <SpacingEditorCheckbox valueIndex={1} state={state} />
        <SpacingEditorCheckbox valueIndex={2} state={state} />
        <SpacingEditorCheckbox valueIndex={3} state={state} />
      </div>
      <ValueSlider state={state} />
      {children && <div className="mb-20">{children}</div>}
      <SpacingEditorInputs state={state} />
    </div>
  );
}

interface ValueSliderProps {
  state: SpacingEditorStateReturn;
}
function ValueSlider({state}: ValueSliderProps) {
  const firstEnabledValue = state.enabledValues[0];
  return (
    <Slider
      size="sm"
      trackColor="neutral"
      showThumbOnHoverOnly={false}
      thumbSize="h-14 w-14"
      className="mb-8"
      minValue={0}
      maxValue={100}
      value={
        state.isConnected && firstEnabledValue != null
          ? (state.value[firstEnabledValue][0] as number)
          : 1
      }
      onChange={newValue =>
        state.setConnectedValue(newValue, {partOfSession: true})
      }
      onChangeEnd={newValue => {
        state.setConnectedValue(newValue, {lastInSession: true});
      }}
      isDisabled={!state.isConnected || state.enabledValues.length === 0}
    />
  );
}

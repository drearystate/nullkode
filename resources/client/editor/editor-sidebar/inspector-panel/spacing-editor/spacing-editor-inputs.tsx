import {SpacingEditorStateReturn} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import {Tooltip} from '@common/ui/tooltip/tooltip';
import {Trans} from '@common/i18n/trans';
import {IconButton} from '@common/ui/buttons/icon-button';
import {LinkIcon} from '@common/icons/material/Link';
import {LinkOffIcon} from '@common/icons/material/LinkOff';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {UnitSelect} from '@app/editor/editor-sidebar/inspector-panel/unit-select';

interface Props {
  state: SpacingEditorStateReturn;
}
export function SpacingEditorInputs({state}: Props) {
  if (state.name === 'borderRadius') {
    return <CornerInputs state={state} />;
  }
  return <EdgeInputs state={state} />;
}

function EdgeInputs({state}: Props) {
  return (
    <div className="grid grid-cols-3 gap-x-8 gap-y-14">
      <div />
      <ValueInput index={0} state={state} />
      <div />
      <ValueInput index={1} state={state} />
      <ConnectButton state={state} />
      <ValueInput index={2} state={state} />
      <div />
      <ValueInput index={3} state={state} />
      <div />
    </div>
  );
}

function CornerInputs({state}: Props) {
  return (
    <div className="grid grid-cols-3 gap-x-8">
      <ValueInput index={0} state={state} />
      <div />
      <ValueInput index={1} state={state} />
      <div />
      <ConnectButton state={state} />
      <div />
      <ValueInput index={2} state={state} />
      <div />
      <ValueInput index={3} state={state} />
    </div>
  );
}

function ConnectButton({state}: Props) {
  return (
    <Tooltip
      label={
        !state.isConnected ? (
          <Trans message="Link values together" />
        ) : (
          <Trans message="Unlink values" />
        )
      }
    >
      <IconButton
        className="mx-auto"
        size="sm"
        iconSize="md"
        onClick={() => {
          state.setIsConnected(!state.isConnected);
        }}
      >
        {state.isConnected ? <LinkIcon /> : <LinkOffIcon />}
      </IconButton>
    </Tooltip>
  );
}

interface ValueInputProps {
  index: number;
  state: SpacingEditorStateReturn;
}
function ValueInput({index, state}: ValueInputProps) {
  const unitSelect = (
    <UnitSelect
      value={state.value[index][1]}
      onChange={newUnit => {
        state.setSingleUnit(index, newUnit as string, {lastInSession: true});
      }}
      name={state.name}
      disabled={!state.enabledValues.includes(index)}
    />
  );

  return (
    <TextField
      inputClassName="min-w-50"
      size="xs"
      endAppend={unitSelect}
      pattern="[0-9]{1,5}"
      value={state.value[index][0]}
      onChange={e => {
        state.setSingleValue(index, e.target.value, {partOfSession: true});
      }}
      onBlur={e => {
        state.setSingleValue(index, e.target.value, {lastInSession: true});
      }}
      disabled={!state.enabledValues.includes(index)}
    />
  );
}

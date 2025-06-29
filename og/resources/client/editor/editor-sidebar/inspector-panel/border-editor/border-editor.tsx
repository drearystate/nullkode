import {SpacingEditor} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/spacing-editor';
import {useSpacingEditorState} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import React, {useRef} from 'react';
import {Trans} from '@common/i18n/trans';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {
  inspectorState,
  useInspectorStore,
} from '@app/editor/state/inspector-store';
import {useBorderEditorState} from '@app/editor/editor-sidebar/inspector-panel/border-editor/use-border-editor-state';
import {ColorPickerInput} from '@app/editor/editor-sidebar/inspector-panel/color-picker-input';
import {ExecuteMutationOptions} from '@app/editor/state/mutation-store';
import {CssStyle} from '@app/editor/mutations/style/css-style';

export function BorderEditor() {
  const borderState = useBorderEditorState();
  const spacingState = useSpacingEditorState({
    name: 'borderWidth',
    onMutate: (value, node, options) => {
      borderState.applyValue(options);
    },
  });

  return (
    <SpacingEditor state={spacingState}>
      <div className="flex items-center gap-8">
        <BorderColorInput />
        <BorderStyleInput />
      </div>
    </SpacingEditor>
  );
}

function BorderColorInput() {
  const state = useBorderEditorState();
  const initialValueRef = useRef<ReturnType<typeof state.getCurrentValue>>();
  const value = useInspectorStore(s => s.currentConfig.borderColor);
  const setValueAndMutate = (
    newColor: string,
    options: ExecuteMutationOptions & {setWidthIfZero?: boolean},
  ) => {
    inspectorState().setValue('borderColor', newColor);
    state.applyValue({
      ...options,
      forceMinimumWidth: options.setWidthIfZero,
    });
  };

  return (
    <ColorPickerInput
      size="sm"
      label={<Trans message="Color" />}
      value={value}
      onChange={newColor => {
        setValueAndMutate(newColor, {
          partOfSession: true,
          setWidthIfZero: true,
        });
      }}
      onChangeEnd={(newColor, {valueChanged}) => {
        const initialValues = initialValueRef.current;
        // reset border width back to zero on color change cancel,
        // if there was no border width when opening color picker
        if (!valueChanged && initialValues) {
          inspectorState().setValues(initialValues);
        }
        setValueAndMutate(newColor, {
          lastInSession: true,
          skipHistory: !valueChanged,
          setWidthIfZero: false,
        });
        initialValueRef.current = undefined;
      }}
      onOpenChange={isOpen => {
        if (isOpen) {
          initialValueRef.current = state.getCurrentValue();
        }
      }}
    />
  );
}

function BorderStyleInput() {
  const state = useBorderEditorState();
  const value = useInspectorStore(s => s.currentConfig.borderStyle);
  const setValueAndMutate = (newStyle: CssStyle['borderStyle']) => {
    inspectorState().setValue('borderStyle', newStyle);
    state.applyValue({
      lastInSession: true,
      forceMinimumWidth: true,
    });
  };

  return (
    <Select
      selectionMode="single"
      label={<Trans message="Style" />}
      selectedValue={value}
      onSelectionChange={newStyle =>
        setValueAndMutate(newStyle as CssStyle['borderStyle'])
      }
      className="flex-auto flex-shrink-0"
      size="xs"
    >
      <Item value="solid">
        <Trans message="Solid" />
      </Item>
      <Item value="dashed">
        <Trans message="Dashed" />
      </Item>
      <Item value="dotted">
        <Trans message="Dotted" />
      </Item>
      <Item value="double">
        <Trans message="Double" />
      </Item>
      <Item value="groove">
        <Trans message="Groove" />
      </Item>
      <Item value="ridge">
        <Trans message="Ridge" />
      </Item>
      <Item value="inset">
        <Trans message="Inset" />
      </Item>
      <Item value="outset">
        <Trans message="Outset" />
      </Item>
    </Select>
  );
}

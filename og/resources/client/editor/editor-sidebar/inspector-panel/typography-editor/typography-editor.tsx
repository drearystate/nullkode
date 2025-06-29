import {FontSelectorDialog} from '@app/editor/editor-sidebar/inspector-panel/typography-editor/font-selector-dialog';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {
  inspectorState,
  useInspectorStore,
} from '@app/editor/state/inspector-store';
import {Trans} from '@common/i18n/trans';
import {KeyboardArrowDownIcon} from '@common/icons/material/KeyboardArrowDown';
import React, {ReactNode} from 'react';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {editorState} from '@app/editor/state/editor-store';
import {SetTextStyle} from '@app/editor/mutations/style/text/set-text-style';
import {UnitSelect} from '@app/editor/editor-sidebar/inspector-panel/unit-select';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {FontConfig} from '@common/http/value-lists';
import {SetFontFamily} from '@app/editor/mutations/style/text/set-font-family';
import {ButtonBase} from '@common/ui/buttons/button-base';
import {ColorPickerInput} from '@app/editor/editor-sidebar/inspector-panel/color-picker-input';
import {IconButton} from '@common/ui/buttons/icon-button';
import {FormatItalicIcon} from '@common/icons/material/FormatItalic';
import {InspectorElementConfig} from '@app/editor/state/generate-inspector-config-for-element';
import {FormatUnderlinedIcon} from '@common/icons/material/FormatUnderlined';
import {FormatStrikethroughIcon} from '@common/icons/material/FormatStrikethrough';
import {FormatAlignLeftIcon} from '@common/icons/material/FormatAlignLeft';
import {FormatAlignCenterIcon} from '@common/icons/material/FormatAlignCenter';
import {FormatAlignRightIcon} from '@common/icons/material/FormatAlignRight';
import {FormatAlignJustifyIcon} from '@common/icons/material/FormatAlignJustify';
import {
  ExecuteMutationOptions,
  mutationState,
} from '@app/editor/state/mutation-store';
import {CssStyle} from '@app/editor/mutations/style/css-style';

export function TypographyEditor() {
  return (
    <div>
      <FontSelectorButton />
      <div className="mb-14 flex items-center gap-10">
        <FontSizeInput />
        <FontWeightSelect />
      </div>
      <div className="mb-14 flex items-center gap-10">
        <TextColorInput label={<Trans message="Color" />} name="color" />
        <TextColorInput
          label={<Trans message="Background" />}
          name="backgroundColor"
        />
      </div>
      <div className="flex items-center gap-8">
        <FontStyleButtons />
        <TextAlignSelect />
      </div>
    </div>
  );
}

function FontSelectorButton() {
  const font = useInspectorStore(s => s.currentConfig.fontFamily);
  return (
    <div className="mb-14">
      <div className="mb-4 text-xs">
        <Trans message="Font family" />
      </div>
      <DialogTrigger
        type="modal"
        onClose={(newValue: FontConfig | undefined) => {
          const node = editorState().selectedContext?.node;
          if (newValue && node) {
            inspectorState().setValue('fontFamily', newValue);
            mutationState().executeMutation(new SetFontFamily(node, newValue), {
              lastInSession: true,
            });
          }
        }}
      >
        <ButtonBase className="flex h-30 w-full items-center gap-12 rounded-input border px-12 text-sm shadow-sm">
          <span className="min-w-0 flex-auto overflow-hidden overflow-ellipsis text-left font-normal">
            {font.family || <Trans message="Default" />}
          </span>
          <KeyboardArrowDownIcon className="text-muted" />
        </ButtonBase>
        <FontSelectorDialog value={font} />
      </DialogTrigger>
    </div>
  );
}

function FontSizeInput() {
  const [value, unit] = useInspectorStore(s => s.currentConfig.fontSize);
  const setValue = (
    data: {value?: string; unit?: string},
    options: ExecuteMutationOptions,
  ) => {
    const newValue = data.value || value;
    const newUnit = data.unit || unit;
    const node = editorState().selectedContext?.node;
    if (node) {
      inspectorState().setValue('fontSize', [newValue, newUnit]);
      mutationState().executeMutation(
        new SetTextStyle({fontSize: `${newValue}${newUnit}`}, node),
        options,
      );
    }
  };

  return (
    <TextField
      type="number"
      size="xs"
      label={<Trans message="Font size" />}
      min={1}
      value={value}
      onChange={e => {
        setValue({value: e.target.value}, {partOfSession: true});
      }}
      onBlur={e => {
        setValue({value: e.target.value}, {lastInSession: true});
      }}
      endAppend={
        <UnitSelect
          name="fontSize"
          value={unit}
          height="h-30"
          onChange={newUnit => setValue({unit: newUnit}, {lastInSession: true})}
        />
      }
    />
  );
}

function FontWeightSelect() {
  const value = useInspectorStore(s => s.currentConfig.fontWeight);
  return (
    <Select
      size="xs"
      selectionMode="single"
      className="flex-auto"
      selectedValue={value}
      onSelectionChange={newValue => {
        const node = editorState().selectedContext?.node;
        const newFontWeight = newValue as string;
        if (node) {
          inspectorState().setValue('fontWeight', newFontWeight);
          mutationState().executeMutation(
            new SetTextStyle({fontWeight: newFontWeight}, node),
            {lastInSession: true},
          );
        }
      }}
      label={<Trans message="Font weight" />}
    >
      <Item value="100">100</Item>
      <Item value="200">200</Item>
      <Item value="300">300</Item>
      <Item value="400">400</Item>
      <Item value="500">500</Item>
      <Item value="600">600</Item>
      <Item value="700">700</Item>
      <Item value="800">800</Item>
      <Item value="900">900</Item>
    </Select>
  );
}

interface TextColorInputProps {
  label: ReactNode;
  name: 'color' | 'backgroundColor';
}
function TextColorInput({label, name}: TextColorInputProps) {
  const value = useInspectorStore(s => s.currentConfig[name]);

  const applyColor = (newColor: string, options: ExecuteMutationOptions) => {
    const node = editorState().selectedContext?.node;
    if (node) {
      inspectorState().setValue(name, newColor);
      mutationState().executeMutation(
        new SetTextStyle({[name]: newColor}, node),
        options,
      );
    }
  };

  return (
    <ColorPickerInput
      size="sm"
      label={label}
      value={value}
      onChangeEnd={(newColor, {valueChanged}) => {
        applyColor(newColor, {lastInSession: true, skipHistory: !valueChanged});
      }}
      onChange={newColor => applyColor(newColor, {partOfSession: true})}
    />
  );
}

function FontStyleButtons() {
  const isItalic = useInspectorStore(
    s => s.currentConfig.fontStyle === 'italic',
  );
  const isUnderline = useInspectorStore(
    s => s.currentConfig.textDecorationLine === 'underline',
  );
  const isLineThrough = useInspectorStore(
    s => s.currentConfig.textDecorationLine === 'line-through',
  );

  const applyStyle = (name: keyof InspectorElementConfig, value: string) => {
    const node = editorState().selectedContext?.node;
    if (node) {
      inspectorState().setValue(name, value);
      mutationState().executeMutation(new SetTextStyle({[name]: value}, node), {
        lastInSession: true,
      });
    }
  };

  return (
    <div>
      <div className="mb-4 text-xs">
        <Trans message="Font style" />
      </div>
      <div className="flex items-center gap-8">
        <IconButton
          size="xs"
          iconSize="sm"
          color={isItalic ? 'primary' : undefined}
          variant="outline"
          onClick={() =>
            applyStyle('fontStyle', isItalic ? 'normal' : 'italic')
          }
        >
          <FormatItalicIcon />
        </IconButton>
        <IconButton
          size="xs"
          iconSize="sm"
          color={isUnderline ? 'primary' : undefined}
          variant="outline"
          onClick={() =>
            applyStyle('textDecorationLine', isUnderline ? 'none' : 'underline')
          }
        >
          <FormatUnderlinedIcon />
        </IconButton>
        <IconButton
          size="xs"
          iconSize="sm"
          color={isLineThrough ? 'primary' : undefined}
          variant="outline"
          onClick={() =>
            applyStyle(
              'textDecorationLine',
              isLineThrough ? 'none' : 'line-through',
            )
          }
        >
          <FormatStrikethroughIcon />
        </IconButton>
      </div>
    </div>
  );
}

function TextAlignSelect() {
  const value = useInspectorStore(s => s.currentConfig.textAlign);
  return (
    <Select
      size="xs"
      label={<Trans message="Align text" />}
      className="ml-auto"
      selectionMode="single"
      selectedValue={value}
      onSelectionChange={x => {
        const newValue = x as CssStyle['textAlign'];
        const node = editorState().selectedContext?.node;
        if (node) {
          inspectorState().setValue('textAlign', newValue!);
          mutationState().executeMutation(
            new SetTextStyle({textAlign: newValue}, node),
            {
              lastInSession: true,
            },
          );
        }
      }}
    >
      <Item value="left" startIcon={<FormatAlignLeftIcon size="xs" />}>
        <Trans message="Left" />
      </Item>
      <Item value="center" startIcon={<FormatAlignCenterIcon size="xs" />}>
        <Trans message="Center" />
      </Item>
      <Item value="right" startIcon={<FormatAlignRightIcon size="xs" />}>
        <Trans message="Right" />
      </Item>
      <Item value="justify" startIcon={<FormatAlignJustifyIcon size="xs" />}>
        <Trans message="Justify" />
      </Item>
    </Select>
  );
}

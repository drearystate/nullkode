import {ColorPickerInput} from '@app/editor/editor-sidebar/inspector-panel/color-picker-input';
import {
  inspectorState,
  useInspectorStore,
} from '@app/editor/state/inspector-store';
import React from 'react';
import {Trans} from '@common/i18n/trans';
import {editorState} from '@app/editor/state/editor-store';
import clsx from 'clsx';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {ButtonBase} from '@common/ui/buttons/button-base';
import {BackgroundSelectorDialog} from '@app/editor/editor-sidebar/inspector-panel/background-editor/background-selector-dialog';
import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {cssPropsFromBgConfig} from '@common/background-selector/css-props-from-bg-config';
import {SetBackground} from '@app/editor/mutations/style/set-background';
import {isCssColorTransparent} from '@app/editor/utils/is-css-color-transparent';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {
  ExecuteMutationOptions,
  mutationState,
} from '@app/editor/state/mutation-store';

export function BackgroundEditor() {
  return (
    <div>
      <BackgroundColorInput />
      <ImageAndGradientInput />
      <BackgroundClipSelect />
    </div>
  );
}

function BackgroundClipSelect() {
  const value = useInspectorStore(s => s.currentConfig.backgroundClip);

  const applyClip = (newValue: string) => {
    const node = editorState().selectedContext?.node;
    if (node) {
      inspectorState().setValue('backgroundClip', newValue);
      mutationState().executeMutation(
        new SetBackground({backgroundClip: newValue}, node),
        {
          lastInSession: true,
        },
      );
    }
  };

  return (
    <Select
      selectedValue={value}
      selectionMode="single"
      label={<Trans message="Clip" />}
      size="xs"
      onSelectionChange={value => applyClip(value as string)}
    >
      <Item
        value="border-box"
        description={
          <Trans message="Any background added will extended to element's boundary." />
        }
      >
        <Trans message="None" />
      </Item>
      <Item
        value="padding-box"
        description={
          <Trans message="Clips background to the inside of the element's border, including any padding added to the element." />
        }
      >
        <Trans message="Padding box" />
      </Item>
      <Item
        value="content-box"
        description={
          <Trans message="Clips background to the edges of the content, excluding any padding added to the element." />
        }
      >
        <Trans message="Content box" />
      </Item>
      <Item
        value="text"
        description={
          <Trans message="Will fill element's text content with background image or gradient." />
        }
      >
        <Trans message="Text" />
      </Item>
    </Select>
  );
}

function BackgroundColorInput() {
  const value = useInspectorStore(s => s.currentConfig.backgroundColor);

  const applyColor = (newColor: string, options: ExecuteMutationOptions) => {
    const node = editorState().selectedContext?.node;
    if (node) {
      inspectorState().setValue('backgroundColor', newColor);
      mutationState().executeMutation(
        new SetBackground({backgroundColor: newColor}, node),
        options,
      );
    }
  };

  return (
    <ColorPickerInput
      size="sm"
      className="mb-12"
      label={<Trans message="Color" />}
      value={value}
      onChangeEnd={(newColor, {valueChanged}) => {
        applyColor(newColor, {lastInSession: true, skipHistory: !valueChanged});
      }}
      onChange={newColor => applyColor(newColor, {partOfSession: true})}
    />
  );
}

function ImageAndGradientInput() {
  const value = useInspectorStore(s => s.currentConfig.backgroundConfig);

  const isTransparent =
    isCssColorTransparent(value?.backgroundColor) &&
    isCssColorTransparent(value?.backgroundImage);

  const applyBackground = (
    bgConfig: BackgroundSelectorConfig,
    options: ExecuteMutationOptions,
  ) => {
    const node = editorState().selectedContext?.node;
    if (node) {
      // if there's no value, user is trying to remove existing uploaded image via upload image dialog
      if (!bgConfig) {
        bgConfig = inspectorState().currentConfig.backgroundConfig;
        delete bgConfig.backgroundImage;
      }
      inspectorState().setValue('backgroundConfig', bgConfig);
      mutationState().executeMutation(
        new SetBackground(cssPropsFromBgConfig(bgConfig), node),
        options,
      );
    }
  };

  return (
    <div className="mb-12 flex-auto flex-shrink-0">
      <div className="pb-4 text-xs">
        <Trans message="Image & Gradient" />
      </div>
      <DialogTrigger
        value={value}
        type="popover"
        placement="right"
        onValueChange={newConfig => {
          applyBackground(newConfig, {partOfSession: true});
        }}
        onClose={(newValue, {valueChanged}) => {
          if (valueChanged) {
            applyBackground(newValue, {
              lastInSession: true,
            });
          }
        }}
      >
        <ButtonBase
          className="h-30 w-full min-w-80 rounded-input border border-divider p-6"
          aria-label="Change background image"
        >
          <span
            className={clsx(
              'block h-full w-full',
              isTransparent && 'transparent-texture',
            )}
            style={isTransparent ? undefined : cssPropsFromBgConfig(value)}
          />
        </ButtonBase>
        <BackgroundSelectorDialog />
      </DialogTrigger>
    </div>
  );
}

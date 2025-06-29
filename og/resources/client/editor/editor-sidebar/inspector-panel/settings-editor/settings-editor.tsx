import {Fragment} from 'react';
import {
  inspectorState,
  useInspectorStore,
} from '@app/editor/state/inspector-store';
import {ChipField} from '@common/ui/forms/input-field/chip-field/chip-field';
import {Trans} from '@common/i18n/trans';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {SyncElClasses} from '@app/editor/mutations/attributes/sync-el-classes';
import {ElementControlConfig} from '@app/editor/elements/architect-element';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {
  ExecuteMutationOptions,
  mutationState,
} from '@app/editor/state/mutation-store';
import {AiIcon} from '@app/editor/ai/ai-icon';
import {IconButton} from '@common/ui/buttons/icon-button';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {GenerateTextWithAiDialog} from '@app/editor/ai/text/generate-text-with-ai-dialog';
import {ModifyAttributes} from '@app/editor/mutations/attributes/modify-attributes';

export function SettingsEditor() {
  return (
    <Fragment>
      <ElementCustomControlList />
      <ClassListEditor />
      <IdField />
    </Fragment>
  );
}

function ClassListEditor() {
  const value = useInspectorStore(s => s.currentConfig.classList);
  const syncClassList = (value: string[]) => {
    const ctx = editorState().selectedContext;
    if (ctx) {
      inspectorState().setValue('classList', value);
      mutationState().executeMutation(
        new SyncElClasses(ctx.node, ctx.el, value),
        {lastInSession: true},
      );
    }
  };

  return (
    <ChipField
      size="xs"
      chipSize="xs"
      value={value}
      onChange={value => syncClassList(value.map(i => i.id) as string[])}
      label={<Trans message="Class list" />}
    />
  );
}

function IdField() {
  const value = useInspectorStore(s => s.currentConfig.id);
  const syncId = (value: string) => {
    const ctx = editorState().selectedContext;
    if (ctx) {
      inspectorState().setValue('id', value);
      mutationState().executeMutation(
        new ModifyAttributes(ctx.node, {id: value}),
        {lastInSession: true},
      );
    }
  };

  return (
    <TextField
      className="mt-14"
      label={<Trans message="ID" />}
      size="xs"
      value={value}
      onChange={e => syncId(e.target.value)}
    />
  );
}

function ElementCustomControlList() {
  const ctx = useEditorStore(s => s.selectedContext);
  // rerender when selected element styling changes (after mutation for example)
  useInspectorStore(s => s.currentConfig);

  return (
    <Fragment>
      {ctx?.el.controls?.map((control, index) => {
        const defaultValue =
          typeof control.defaultValue === 'function'
            ? control.defaultValue(editorState().selectedContext!.node)
            : control.defaultValue;

        if (control.shouldHide?.(ctx?.node)) {
          return null;
        }

        switch (control.type) {
          case 'input':
            return (
              <ElementCustomInputControl
                // change key to force rerender input when selected element changes to avoid stale values
                key={`${ctx!.nodeId}.${index}`}
                control={control}
                value={defaultValue}
              />
            );
          case 'select':
            return (
              <ElementCustomSelectControl
                key={`${ctx!.nodeId}.${index}`}
                control={control}
                value={defaultValue}
              />
            );
        }
      })}
    </Fragment>
  );
}

interface ElementCustomControlProps {
  control: ElementControlConfig;
  value: string | number;
}
function ElementCustomInputControl({
  control,
  value,
}: ElementCustomControlProps) {
  const handleValueChange = (value: string, isFinal: boolean) => {
    const options: ExecuteMutationOptions = isFinal
      ? {lastInSession: true}
      : // force rerender so input value is updated
        {partOfSession: true, forceSyncEditor: true};
    control.onChange?.(editorState().selectedContext!.node, value, options);
  };

  const aiTextButton = (
    <DialogTrigger
      type="modal"
      onClose={newValue => {
        if (newValue) {
          handleValueChange(newValue, true);
        }
      }}
    >
      <IconButton
        size={null}
        className="h-24 w-24"
        iconSize="xs"
        color="primary"
      >
        <AiIcon />
      </IconButton>
      <GenerateTextWithAiDialog
        initialScreen={
          !value
            ? undefined
            : () => ({
                name: 'refine',
                originalText: `${value}`,
              })
        }
      />
    </DialogTrigger>
  );

  return (
    <TextField
      className="mb-14"
      size="xs"
      label={control.label}
      labelSuffix={control.showAiTextButton ? aiTextButton : undefined}
      value={value}
      type={control.inputType}
      min={control.min}
      max={control.max}
      onChange={e => handleValueChange(e.target.value, false)}
      onBlur={e => handleValueChange(e.target.value, true)}
    />
  );
}

function ElementCustomSelectControl({
  control,
  value,
}: ElementCustomControlProps) {
  return (
    <Select
      className="mb-14"
      size="xs"
      selectionMode="single"
      selectedValue={value}
      label={<Trans message={control.label} />}
      onSelectionChange={newValue =>
        control.onChange?.(editorState().selectedContext!.node, `${newValue}`, {
          lastInSession: true,
        })
      }
    >
      {control.options?.map((option, index) => (
        <Item key={index} value={option.value}>
          <Trans message={option.key} />
        </Item>
      ))}
    </Select>
  );
}

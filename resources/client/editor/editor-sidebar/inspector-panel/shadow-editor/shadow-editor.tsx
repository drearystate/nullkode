import {Button} from '@common/ui/buttons/button';
import {Trans} from '@common/i18n/trans';
import {AddIcon} from '@common/icons/material/Add';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {EditShadowDialog} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/edit-shadow-dialog';
import {shadowEditorValueToString} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/css-shadow-parser';
import {editorState} from '@app/editor/state/editor-store';
import {
  inspectorState,
  useInspectorStore,
} from '@app/editor/state/inspector-store';
import {SetBoxShadow} from '@app/editor/mutations/style/shadow/set-box-shadow';
import {IconButton} from '@common/ui/buttons/icon-button';
import {DeleteIcon} from '@common/icons/material/Delete';
import {EditIcon} from '@common/icons/material/Edit';
import {defaultBoxShadow} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/default-box-shadow';
import {SetTextShadow} from '@app/editor/mutations/style/shadow/set-text-shadow';
import {Fragment, useState} from 'react';
import {ShadowEditorValue} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/shadow-editor-value';
import {
  ExecuteMutationOptions,
  mutationState,
} from '@app/editor/state/mutation-store';

function removeShadow(index: number, options: ExecuteMutationOptions) {
  const node = editorState().selectedContext?.node;
  if (node) {
    const shadows = inspectorState().removeShadowValue(index);
    mutationState().executeMutation(
      new SetBoxShadow(
        shadows.map(s => shadowEditorValueToString(s)).join(', '),
        node,
      ),
      options,
    );
  }
}

const applyShadow = (
  newShadow: ShadowEditorValue,
  index: number,
  options: ExecuteMutationOptions,
) => {
  const node = editorState().selectedContext?.node;
  if (node) {
    const shadows = inspectorState().setShadowValue(newShadow, index);

    const textShadows: ShadowEditorValue[] = [];
    const boxShadows: ShadowEditorValue[] = [];
    shadows.forEach(shadow => {
      if (shadow.type === 'text') {
        textShadows.push(shadow);
      } else {
        boxShadows.push(shadow);
      }
    });

    if (textShadows.length) {
      mutationState().executeMutation(
        new SetTextShadow(
          textShadows.map(s => shadowEditorValueToString(s)).join(', '),
          node,
        ),
        options,
      );
    }

    if (boxShadows.length) {
      mutationState().executeMutation(
        new SetBoxShadow(
          boxShadows.map(s => shadowEditorValueToString(s)).join(', '),
          node,
        ),
        options,
      );
    }
  }
};

export function ShadowEditor() {
  return (
    <Fragment>
      <ShadowList />
      <AddShadowButton />
    </Fragment>
  );
}

function ShadowList() {
  const shadows = useInspectorStore(s => s.currentConfig.shadows);
  if (!shadows.length) return null;
  return (
    <div className="mb-10 text-xs text-muted">
      {shadows.map((shadow, index) => (
        <div key={index} className="flex items-center">
          <div
            className="mr-4 h-14 w-14"
            style={{backgroundColor: shadow.color}}
          />
          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
            {shadow.type === 'box' ? (
              <Trans
                message="Box shadow: :value"
                values={{
                  value: `${shadow.angle}px ${shadow.blur}px ${shadow.distance}px ${shadow.spread}px`,
                }}
              />
            ) : (
              <Trans
                message="Text shadow: :value"
                values={{
                  value: `${shadow.angle}px ${shadow.blur}px ${shadow.distance}px`,
                }}
              />
            )}
          </div>
          <DialogTrigger
            type="popover"
            value={shadow}
            onValueChange={newShadow => {
              applyShadow(newShadow, index, {partOfSession: true});
            }}
          >
            <IconButton size="xs" className="ml-auto">
              <EditIcon />
            </IconButton>
            <EditShadowDialog />
          </DialogTrigger>
          <IconButton
            size="xs"
            onClick={() => removeShadow(index, {lastInSession: true})}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      ))}
    </div>
  );
}

function AddShadowButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState<ShadowEditorValue>({...defaultBoxShadow});
  return (
    <DialogTrigger
      type="popover"
      placement="right"
      offset={10}
      value={value}
      isOpen={isOpen}
      onOpenChange={isOpen => {
        if (isOpen) {
          setValue({...defaultBoxShadow});
          inspectorState().setShadowValue(value);
          applyShadow(
            value,
            inspectorState().currentConfig.shadows.length - 1,
            {
              partOfSession: true,
              skipHistory: true,
            },
          );
        }
        setIsOpen(isOpen);
      }}
      onValueChange={newShadow => {
        setValue(newShadow);
        applyShadow(
          newShadow,
          inspectorState().currentConfig.shadows.length - 1,
          {partOfSession: true},
        );
      }}
      onClose={(newShadow, {valueChanged}) => {
        if (newShadow) {
          applyShadow(
            newShadow,
            inspectorState().currentConfig.shadows.length - 1,
            {
              lastInSession: true,
              skipHistory: !valueChanged,
            },
          );
        } else {
          removeShadow(inspectorState().currentConfig.shadows.length - 1, {
            lastInSession: true,
            skipHistory: true,
          });
        }
        setValue({...defaultBoxShadow});
      }}
    >
      <Button
        variant="outline"
        color="primary"
        size="2xs"
        startIcon={<AddIcon />}
      >
        <Trans message="Add shadow" />
      </Button>
      <EditShadowDialog />
    </DialogTrigger>
  );
}

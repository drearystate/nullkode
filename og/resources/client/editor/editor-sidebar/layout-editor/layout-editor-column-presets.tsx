import clsx from 'clsx';
import {Trans} from '@common/i18n/trans';
import {
  layoutEditorState,
  useLayoutEditorStore,
} from '@app/editor/editor-sidebar/layout-editor/layout-editor-store';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {CustomRowPresetDialog} from '@app/editor/editor-sidebar/layout-editor/custom-row-preset-dialog';

const presets = [
  [12],
  [6, 6],
  [4, 8],
  [8, 4],
  [4, 4, 4],
  [3, 3, 3, 3],
  [2, 2, 2, 2, 2, 2],
];

export function LayoutEditorColumnPresets() {
  return (
    <div className="grid grid-cols-4 gap-6">
      {presets.map((preset, index) => (
        <PresetButton key={index} preset={preset} />
      ))}
      <CustomPresetButton />
    </div>
  );
}

interface PresetButtonProps {
  preset: number[];
}
function PresetButton({preset}: PresetButtonProps) {
  const activePreset = useLayoutEditorStore(
    s => s.selectedRow?.columns.map(p => p.span).join('+'),
  );
  return (
    <button
      className="group flex items-center gap-2"
      onClick={() => {
        layoutEditorState().applyRowPreset(preset);
      }}
    >
      {preset.map((span, index) => (
        <span
          key={index}
          style={{flex: span}}
          className={clsx(
            'block h-28 rounded-sm transition-bg-color group-hover:bg-primary',
            activePreset === preset.join('+')
              ? 'bg-primary'
              : 'bg-primary-light',
          )}
        />
      ))}
    </button>
  );
}

function CustomPresetButton() {
  const activePreset = useLayoutEditorStore(
    s => s.selectedRow?.columns.map(p => p.span).join('+'),
  );
  const isActive = !presets.some(preset => activePreset === preset.join('+'));
  return (
    <DialogTrigger
      type="popover"
      onClose={newValue => {
        if (newValue) {
          layoutEditorState().applyRowPreset(newValue.split('+'));
        }
      }}
    >
      <button
        className={clsx(
          'block h-28 rounded-sm text-xs font-bold text-on-primary transition-bg-color hover:bg-primary',
          isActive ? 'bg-primary' : 'bg-primary-light',
        )}
      >
        <Trans message="Custom" />
      </button>
      <CustomRowPresetDialog />
    </DialogTrigger>
  );
}

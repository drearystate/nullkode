import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {Button} from '@common/ui/buttons/button';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {Slider} from '@common/ui/forms/slider/slider';
import {ColorPickerInput} from '@app/editor/editor-sidebar/inspector-panel/color-picker-input';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import {SegmentedRadio} from '@common/ui/forms/segmented-radio-group/segmented-radio';
import {SegmentedRadioGroup} from '@common/ui/forms/segmented-radio-group/segmented-radio-group';
import {ShadowEditorValue} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/shadow-editor-value';

export function EditShadowDialog() {
  const {value, setValue, close} = useDialogContext<ShadowEditorValue>();
  return (
    <Dialog size="xs">
      <DialogHeader>
        <Trans message="Adjust shadow" />
      </DialogHeader>
      <DialogBody>
        <Select
          className="mb-14"
          label={<Trans message="Type" />}
          selectionMode="single"
          size="xs"
          selectedValue={value.type}
          onSelectionChange={type =>
            setValue({...value, type: type as ShadowEditorValue['type']})
          }
        >
          <Item value="text">
            <Trans message="Text" />
          </Item>
          <Item value="box">
            <Trans message="Box" />
          </Item>
        </Select>
        {value.type === 'box' && (
          <SegmentedRadioGroup
            width="w-full"
            className="mb-14"
            size="xs"
            value={value.inset ? 'inside' : 'outside'}
            onChange={newValue => {
              setValue({...value, inset: newValue === 'inside'});
            }}
          >
            <SegmentedRadio value="outside">
              <Trans message="Outside" />
            </SegmentedRadio>
            <SegmentedRadio value="inside">
              <Trans message="Inside" />
            </SegmentedRadio>
          </SegmentedRadioGroup>
        )}
        <ColorPickerInput
          size="sm"
          className="mb-14"
          label={<Trans message="Color" />}
          value={value.color}
          onChange={newColor => setValue({...value, color: newColor})}
          onChangeEnd={() => {}}
          hideFooter
        />
        <Slider
          size="xs"
          label={<Trans message="Angle" />}
          value={value.angle}
          onChange={newAngle => setValue({...value, angle: newAngle})}
          minValue={0}
          maxValue={360}
        />
        <Slider
          size="xs"
          label={<Trans message="Distance" />}
          value={value.distance}
          onChange={newDistance => setValue({...value, distance: newDistance})}
          minValue={0}
          maxValue={20}
        />
        <Slider
          size="xs"
          label={<Trans message="Blur" />}
          value={value.blur}
          onChange={newBlur => setValue({...value, blur: newBlur})}
          minValue={0}
          maxValue={20}
        />
        {value.type === 'box' && (
          <Slider
            size="xs"
            label={<Trans message="Spread" />}
            value={value.spread}
            onChange={newSpread => setValue({...value, spread: newSpread})}
            minValue={0}
            maxValue={20}
          />
        )}
      </DialogBody>
      <DialogFooter>
        <Button size="xs" onClick={() => close()}>
          <Trans message="Cancel" />
        </Button>
        <Button
          variant="flat"
          color="primary"
          size="xs"
          onClick={() => close(value)}
        >
          <Trans message="Save" />
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

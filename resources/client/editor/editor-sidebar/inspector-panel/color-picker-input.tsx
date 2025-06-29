import React, {ReactNode} from 'react';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {ButtonBase} from '@common/ui/buttons/button-base';
import {ColorPickerDialog} from '@common/ui/color-picker/color-picker-dialog';
import clsx from 'clsx';
import {isCssColorTransparent} from '@app/editor/utils/is-css-color-transparent';

interface Props {
  label: ReactNode;
  size?: 'sm' | 'md';
  value: string;
  onChangeEnd: (value: string, data: {valueChanged: boolean}) => void;
  onChange: (value: string) => void;
  className?: string;
  hideFooter?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}
export function ColorPickerInput({
  size = 'md',
  label,
  value,
  onChange,
  onChangeEnd,
  className,
  hideFooter,
  onOpenChange,
}: Props) {
  return (
    <div className={clsx('flex-auto flex-shrink-0', className)}>
      <div className={clsx('pb-4', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {label}
      </div>
      <DialogTrigger
        value={value}
        type="popover"
        placement="right"
        onOpenChange={onOpenChange}
        onClose={(newColor, {valueChanged}) => {
          onChangeEnd(newColor, {valueChanged});
        }}
        onValueChange={newColor => onChange(newColor)}
      >
        <ButtonBase
          className={clsx(
            'h-30 w-full min-w-80 rounded-input border border-divider p-6',
            size === 'sm' ? 'h-30' : 'h-36',
          )}
          aria-label="Change border color"
        >
          <span
            className={clsx(
              'block h-full w-full',
              isCssColorTransparent(value) && 'transparent-texture',
            )}
            style={{backgroundColor: value}}
          />
        </ButtonBase>
        <ColorPickerDialog hideFooter={hideFooter} />
      </DialogTrigger>
    </div>
  );
}

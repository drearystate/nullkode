import {Item} from '@common/ui/forms/listbox/item';
import {Select} from '@common/ui/forms/select/select';
import {Fragment} from 'react';
import clsx from 'clsx';

interface Props {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  name:
    | 'padding'
    | 'margin'
    | 'borderWidth'
    | 'borderRadius'
    | 'fontSize'
    | 'width'
    | 'height';
  height?: string;
}
export function UnitSelect({
  value,
  onChange,
  disabled,
  name,
  height = 'h-30',
}: Props) {
  return (
    <Select
      selectionMode="single"
      size="sm"
      selectedValue={value}
      onSelectionChange={newUnit => onChange(newUnit as string)}
      unstyled
      hideCaret
      inputClassName={clsx(
        'border-r px-6 border-y focus-visible:ring rounded-r-input focus-visible:outline-none',
        height,
      )}
      floatingWidth="auto"
      className="text-[10px] text-muted"
      disabled={disabled}
    >
      <Item value="px">PX</Item>
      {name !== 'borderWidth' && <Item value="%">%</Item>}
      <Item value="ch">CH</Item>
      <Item value="em">EM</Item>
      <Item value="rem">REM</Item>
      {(name === 'width' || name === 'height') && (
        <Fragment>
          <Item value="vw">VW</Item>
          <Item value="vh">VH</Item>
          <Item value="dvw">DVW</Item>
          <Item value="dvh">DVH</Item>
        </Fragment>
      )}
    </Select>
  );
}

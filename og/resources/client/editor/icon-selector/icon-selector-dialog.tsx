import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {useDialogContext} from '@common/ui/overlays/dialog/dialog-context';
import React, {useState} from 'react';
import {
  getFontAwesomeIconList,
  IconConfig,
} from '@app/editor/utils/get-font-awesome-icon-list';
import {ButtonBase} from '@common/ui/buttons/button-base';
import {iconGridStyle} from '@common/ui/icon-picker/icon-grid-style';
import clsx from 'clsx';
import {useFilter} from '@common/i18n/use-filter';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {useTrans} from '@common/i18n/use-trans';

export function IconSelectorDialog() {
  const {trans} = useTrans();
  const {close} = useDialogContext();

  const [icons] = useState<IconConfig[]>(() => {
    return getFontAwesomeIconList();
  });

  const [searchQuery, setSearchQuery] = React.useState('');
  const {contains} = useFilter({
    sensitivity: 'base',
  });
  const filteredIcons = icons.filter(config =>
    contains(config.name, searchQuery),
  );

  return (
    <Dialog size="2xl">
      <DialogHeader>
        <Trans message="Select an icon" />
      </DialogHeader>
      <DialogBody>
        <TextField
          className="mb-20"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
          }}
          placeholder={trans({message: 'Search icons...'})}
        />
        <div className={iconGridStyle.grid}>
          {filteredIcons.map(config => (
            <ButtonBase
              onClick={() => close(config.icon)}
              className={clsx(iconGridStyle.button, 'text-3xl')}
              key={config.name}
            >
              <span className={`fab ${config.icon}`} />
              <span className="mt-16 block whitespace-normal text-xs capitalize">
                {config.name}
              </span>
            </ButtonBase>
          ))}
        </div>
      </DialogBody>
    </Dialog>
  );
}

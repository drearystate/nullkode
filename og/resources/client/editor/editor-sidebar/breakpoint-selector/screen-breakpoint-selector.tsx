import {IconButton} from '@common/ui/buttons/icon-button';
import {PhoneIphoneIcon} from '@common/icons/material/PhoneIphone';
import {Trans} from '@common/i18n/trans';
import {editorScreenBreakpoint} from '@app/editor/editor-sidebar/breakpoint-selector/editor-screen-breakpoint';
import {TabletMacIcon} from '@common/icons/material/TabletMac';
import {LaptopMacIcon} from '@common/icons/material/LaptopMac';
import {DesktopMacIcon} from '@common/icons/material/DesktopMac';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {Menu, MenuTrigger} from '@common/ui/navigation/menu/menu-trigger';
import {Item} from '@common/ui/forms/listbox/item';
import {DevicesIcon} from '@common/icons/material/Devices';

export function ScreenBreakpointSelector() {
  const value = useEditorStore(s => s.selectedBreakpoint);
  return (
    <MenuTrigger
      placement="top"
      selectionMode="single"
      selectedValue={value}
      onSelectionChange={newValue => {
        editorState().setSelectedBreakpoint(newValue as editorScreenBreakpoint);
      }}
    >
      <IconButton
        variant="outline"
        size={null}
        className="h-full flex-auto"
        border="border-r"
        radius="rounded-none"
      >
        <TriggerIcon value={value} />
      </IconButton>
      <Menu>
        <Item
          value={editorScreenBreakpoint.mobile}
          startIcon={<PhoneIphoneIcon />}
          description={
            <Trans message=":size and smaller" values={{size: '768px'}} />
          }
        >
          <Trans message="Mobile portrait" />
        </Item>
        <Item
          value={editorScreenBreakpoint.tablet}
          startIcon={<TabletMacIcon />}
          description={
            <Trans message=":size and smaller" values={{size: '992px'}} />
          }
        >
          <Trans message="Tablet portrait" />
        </Item>
        <Item
          value={editorScreenBreakpoint.laptop}
          startIcon={<LaptopMacIcon />}
          description={
            <Trans message=":size and smaller" values={{size: '1200px'}} />
          }
        >
          <Trans message="Small desktop" />
        </Item>
        <Item
          value={editorScreenBreakpoint.desktop}
          startIcon={<DesktopMacIcon />}
          description={
            <Trans message=":size and bigger" values={{size: '1201px'}} />
          }
        >
          <Trans message="Large desktop" />
        </Item>
      </Menu>
    </MenuTrigger>
  );
}

interface TriggerIconProps {
  value: editorScreenBreakpoint | null;
}
function TriggerIcon({value}: TriggerIconProps) {
  switch (value) {
    case editorScreenBreakpoint.mobile:
      return <PhoneIphoneIcon />;
    case editorScreenBreakpoint.tablet:
      return <TabletMacIcon />;
    case editorScreenBreakpoint.laptop:
      return <LaptopMacIcon />;
    case editorScreenBreakpoint.desktop:
      return <DesktopMacIcon />;
    default:
      return <DevicesIcon />;
  }
}

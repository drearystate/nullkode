import {Switch} from '@common/ui/forms/toggle/switch';
import {Trans} from '@common/i18n/trans';
import {
  inspectorState,
  useInspectorStore,
} from '@app/editor/state/inspector-store';
import {ResponsiveHiddenOnValue} from '@app/editor/editor-sidebar/inspector-panel/visibility-editor/hidden-on-handler';
import {cloneElement, ReactElement, ReactNode} from 'react';
import {editorState} from '@app/editor/state/editor-store';
import {ChangeVisibility} from '@app/editor/mutations/attributes/change-visibility';
import {PhoneIphoneIcon} from '@common/icons/material/PhoneIphone';
import {TabletMacIcon} from '@common/icons/material/TabletMac';
import {LaptopMacIcon} from '@common/icons/material/LaptopMac';
import {DesktopMacIcon} from '@common/icons/material/DesktopMac';
import {SvgIconProps} from '@common/icons/svg-icon';
import {
  ExecuteMutationOptions,
  mutationState,
} from '@app/editor/state/mutation-store';
import {Slider} from '@common/ui/forms/slider/slider';
import {SetOpacity} from '@app/editor/mutations/style/set-opacity';

export function VisibilityEditor() {
  return (
    <div>
      <BreakpointSwitch
        breakpoint="sm"
        className="mb-10"
        icon={<PhoneIphoneIcon />}
      >
        <Trans message="Hide on mobile" />
      </BreakpointSwitch>
      <BreakpointSwitch
        breakpoint="md"
        className="mb-10"
        icon={<TabletMacIcon />}
      >
        <Trans message="Hide on tablet" />
      </BreakpointSwitch>
      <BreakpointSwitch
        breakpoint="lg"
        className="mb-10"
        icon={<LaptopMacIcon />}
      >
        <Trans message="Hide on small desktop" />
      </BreakpointSwitch>
      <BreakpointSwitch
        breakpoint="xl"
        icon={<DesktopMacIcon />}
        className="mb-14"
      >
        <Trans message="Hide on large desktop" />
      </BreakpointSwitch>
      <OpacitySlider />
    </div>
  );
}

function OpacitySlider() {
  const value = useInspectorStore(s => s.currentConfig.opacity);
  const setValue = (
    newValue: string | number,
    options: ExecuteMutationOptions,
  ) => {
    const node = editorState().selectedContext?.node;
    if (node) {
      inspectorState().setValue('opacity', `${newValue}`);
      mutationState().executeMutation(
        new SetOpacity(`${newValue}`, node),
        options,
      );
    }
  };
  return (
    <Slider
      size="sm"
      trackColor="neutral"
      label={<Trans message="Opacity" />}
      showThumbOnHoverOnly={false}
      wrapperHeight="h-18"
      thumbSize="h-14 w-14"
      minValue={0}
      step={0.1}
      maxValue={1}
      value={parseFloat(value)}
      onChange={newValue => {
        setValue(newValue, {partOfSession: true});
      }}
      onChangeEnd={newValue => {
        setValue(newValue, {lastInSession: true});
      }}
    />
  );
}

interface BreakpointSwitchProps {
  breakpoint: keyof ResponsiveHiddenOnValue;
  children: ReactNode;
  icon: ReactElement<SvgIconProps>;
  className?: string;
}
function BreakpointSwitch({
  breakpoint,
  children,
  icon,
  className,
}: BreakpointSwitchProps) {
  const value = useInspectorStore(s => s.currentConfig.responsiveHiddenOn);
  const applyValue = (isHidden: boolean) => {
    const node = editorState().selectedContext?.node;
    if (node) {
      const newValue = {
        ...inspectorState().currentConfig.responsiveHiddenOn,
        [breakpoint]: isHidden,
      };
      inspectorState().setValue('responsiveHiddenOn', newValue);
      mutationState().executeMutation(new ChangeVisibility(node, newValue), {
        lastInSession: true,
      });
    }
  };

  return (
    <Switch
      size="sm"
      className={className}
      checked={value[breakpoint]}
      iconRight={cloneElement(icon, {
        size: 'sm',
        className: 'ml-auto text-muted',
      })}
      onChange={e => {
        applyValue(e.target.checked);
      }}
    >
      {children}
    </Switch>
  );
}

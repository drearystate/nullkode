import {SidebarPanel} from '@app/editor/editor-sidebar/sidebar-panel';
import {IconTree} from '@common/icons/create-svg-icon';
import {ReactElement} from 'react';
import {SvgIconProps} from '@common/icons/svg-icon';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {contentEditableStore} from '@app/editor/state/content-editable-store';
import {ExecuteMutationOptions} from '@app/editor/state/mutation-store';

export enum ElementEditableProp {
  Padding = 'padding',
  Margin = 'margin',
  Border = 'border',
  Text = 'text',
  Settings = 'settings',
  Visibility = 'visibility',
  Shadow = 'shadow',
  Background = 'background',
}

export enum ElementControlType {
  Select = 'select',
  Input = 'input',
}

export interface ElementControlConfig {
  label: string;
  type: ElementControlType;
  showAiTextButton?: boolean;
  shouldHide?: (node: HTMLElement | undefined) => boolean;
  defaultValue: string | ((node: HTMLElement) => string);
  inputType?: 'text' | 'number';
  min?: number;
  max?: number;
  options?: {key: string; value: string}[];
  onChange?: (
    node: HTMLElement,
    value: string,
    options: ExecuteMutationOptions,
  ) => void;
}

export class ArchitectElControl implements Partial<ElementControlConfig> {
  label: ElementControlConfig['label'] = '';
  defaultValue: ElementControlConfig['defaultValue'] = '';
  type: ElementControlConfig['type'] = ElementControlType.Input;
  inputType: ElementControlConfig['inputType'] = 'text';
  showAiTextButton: boolean = false;
  shouldHide: ElementControlConfig['shouldHide'] = () => false;
  options: ElementControlConfig['options'] = [];
  onChange: ElementControlConfig['onChange'] = () => {};
  min: ElementControlConfig['min'] = 0;
  max: ElementControlConfig['max'] = 100;
  constructor(config: ElementControlConfig) {
    Object.entries(config).forEach(([key, value]) => {
      // @ts-ignore
      this[key] = value;
    });
  }
}

export abstract class ArchitectElement {
  abstract name: string;
  defaultSidebarPanel: SidebarPanel = SidebarPanel.STYLE;
  icon?: IconTree[] | ReactElement<SvgIconProps>;
  category?: string;
  html?: string;
  css?: string;
  hiddenClasses?: string[] = [];
  specificity = 0;

  editActions: {
    name: string;
    action:
      | ((node: HTMLElement) => void)
      | 'aiCreateText'
      | 'aiEditText'
      | 'aiCreateImage';
  }[] = [];

  canEdit: ElementEditableProp[] = [
    ElementEditableProp.Settings,
    ElementEditableProp.Visibility,
    ElementEditableProp.Padding,
    ElementEditableProp.Margin,
    ElementEditableProp.Border,
    ElementEditableProp.Shadow,
    ElementEditableProp.Background,
  ];
  canDrag = true;
  controls: ArchitectElControl[] = [];
  resizable = true;
  contextMenu = true;
  contentCategories = ['flow'];
  allowedContent: string[] = ['flow'];
  allowedEls: (typeof ArchitectElement)[] = [];

  abstract matcher(node: HTMLElement): boolean | HTMLElement;
}

export abstract class ArchitectTextEl extends ArchitectElement {
  canEdit: ElementEditableProp[] = [
    ElementEditableProp.Settings,
    ElementEditableProp.Visibility,
    ElementEditableProp.Padding,
    ElementEditableProp.Margin,
    ElementEditableProp.Border,
    ElementEditableProp.Shadow,
    ElementEditableProp.Background,
    ElementEditableProp.Text,
  ];
  editActions = [
    {
      name: 'Edit text',
      action: (node: HTMLElement) => {
        setSelectedContext(node);
        contentEditableStore().startSession();
      },
    },
    {
      name: 'Write with AI',
      action: 'aiCreateText' as const,
    },
    {
      name: 'Edit with AI',
      action: 'aiEditText' as const,
    },
  ];
}

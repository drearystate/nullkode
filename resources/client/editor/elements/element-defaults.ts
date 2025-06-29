import {ElementEditableProp} from './architect-element';

export const ELEMENT_DEFAULTS = {
  name: 'Generic',
  canEdit: [
    ElementEditableProp.Padding,
    ElementEditableProp.Margin,
    ElementEditableProp.Border,
    ElementEditableProp.Text,
    ElementEditableProp.Settings,
    ElementEditableProp.Shadow,
    ElementEditableProp.Background,
  ],
  specificity: 0,
  canDrag: true,
  controls: [],
  resizable: true,
  contextMenu: true,
  contentCategories: ['flow'],
  allowedContent: ['flow'],
  allowedEls: [],
  hiddenClasses: [],
  defaultInspectorPanel: 'style',
};

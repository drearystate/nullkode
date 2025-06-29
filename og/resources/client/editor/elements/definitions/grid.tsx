import {
  ArchitectElControl,
  ArchitectElement,
  ElementControlType,
} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {SidebarPanel} from '@app/editor/editor-sidebar/sidebar-panel';
import {CropSquareIcon} from '@common/icons/material/CropSquare';
import {ViewStreamIcon} from '@common/icons/material/ViewStream';
import {editorState} from '@app/editor/state/editor-store';
import {ReplaceClass} from '@app/editor/mutations/attributes/replace-class';
import {nodeIsColumn} from '@app/editor/editor-sidebar/layout-editor/node-is-column';
import {mutationState} from '@app/editor/state/mutation-store';

export abstract class LayoutEl extends ArchitectElement {
  defaultSidebarPanel = SidebarPanel.LAYOUT;
  specificity = 3;
  editActions = [
    {
      name: 'Edit layout',
      action: () => {
        editorState().setActivePanel(SidebarPanel.LAYOUT);
      },
    },
  ];
}

export class ContainerEl extends LayoutEl {
  name = 'container';
  html = '<div class="container"></div>';
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'layout';
  icon = (<CropSquareIcon />);
  hiddenClasses = ['container', 'container-fluid'];
  controls = [
    new ArchitectElControl({
      label: 'Type',
      type: ElementControlType.Select,
      options: [
        {key: 'Default', value: 'container'},
        {key: 'Wide', value: 'container-fluid'},
      ],
      defaultValue(node: HTMLElement) {
        const val = this.options!.find(o => node.classList.contains(o.value));
        return (val || this.options![0]).value;
      },
      onChange(node: HTMLElement, value: string) {
        const currentSize = this.options!.find(o =>
          node.classList.contains(o.value),
        )?.value;
        mutationState().executeMutation(
          new ReplaceClass(node, value, currentSize ?? ''),
          {lastInSession: true},
        );
      },
    }),
  ];

  matcher(node: HTMLElement) {
    return hasClass(node, 'container');
  }
}

export class RowEl extends LayoutEl {
  name = 'row';
  html =
    '<section class="row"><div class="col-md-4"></div><div class="col-md-3"></div><div class="col-md-5"></div></section>';
  contentCategories = ['flow'];
  allowedEls = [ColumnEl];
  category = 'layout';
  icon = (<ViewStreamIcon />);
  matcher(node: HTMLElement) {
    return hasClass(node, 'row');
  }
}

export class ColumnEl extends LayoutEl {
  name = 'column';
  html = '<div class="col-sm-6"></div>';
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  matcher(node: HTMLElement) {
    return nodeIsColumn(node);
  }
}

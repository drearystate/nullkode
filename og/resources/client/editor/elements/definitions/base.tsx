import {
  ArchitectElControl,
  ArchitectElement,
  ArchitectTextEl,
  ElementControlType,
  ElementEditableProp,
} from '../architect-element';
import {ShortTextIcon} from '@common/icons/material/ShortText';
import {RemoveIcon} from '@common/icons/material/Remove';
import {InfoIcon} from '@common/icons/material/Info';
import {ViewListIcon} from '@common/icons/material/ViewList';
import {FormatQuoteIcon} from '@common/icons/material/FormatQuote';
import {FormatListBulletedIcon} from '@common/icons/material/FormatListBulleted';
import {TouchAppIcon} from '@common/icons/material/TouchApp';
import {CropLandscapeIcon} from '@common/icons/material/CropLandscape';
import {FormatSizeIcon} from '@common/icons/material/FormatSize';
import {openIconSelector} from '@app/editor/icon-selector/open-icon-selector';
import {ModifyAttributes} from '@app/editor/mutations/attributes/modify-attributes';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {ReplaceClass} from '@app/editor/mutations/attributes/replace-class';
import {EmojiEmotionsIcon} from '@common/icons/material/EmojiEmotions';
import {RenameNode} from '@app/editor/mutations/dom/rename-node';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {SelectedElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {ReplaceNodeContent} from '@app/editor/mutations/dom/replace-node-content';
import {mutationState} from '@app/editor/state/mutation-store';

export class ParagraphEl extends ArchitectTextEl {
  name = 'paragraph';
  html = `<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.</p>`;
  contentCategories = ['flow'];
  allowedContent = ['phrasing'];
  category = 'typography';
  icon = (<ShortTextIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'P';
  }
}
export class DividerEl extends ArchitectElement {
  name = 'divider';
  html = '<hr>';
  contentCategories = ['flow'];
  allowedContent = [];
  category = 'layout';
  icon = (<RemoveIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'HR';
  }
}
export class MarkedTextEl extends ArchitectTextEl {
  name = 'marked text';
  html = '<mark>Marked Text</mark>';
  contentCategories = ['flow', 'phrasing'];
  allowedContent = ['phrasing'];
  category = 'typography';
  icon = (<InfoIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'MARK';
  }
}

export class DefinitionListEl extends ArchitectElement {
  name = 'definition list';
  html = `<dl class="dl-horizontal"><dt>Description lists</dt><dd>A description list is perfect for defining terms.</dd><dt>Euismod</dt><dd>Vestibulum id ligula porta felis euismod semper eget lacinia odio sem nec elit.</dd><dd>Donec id elit non mi porta gravida at eget metus.</dd><dt>Malesuada porta</dt><dd>Etiam porta sem malesuada magna mollis euismod.</dd><dt>Felis euismod semper eget lacinia</dt><dd>Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.</dd></dl>`;
  contentCategories = ['flow', 'sectioning root'];
  allowedContent = ['dt', 'dd'];
  category = 'typography';
  icon = (<ViewListIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'DL';
  }
}

export class BlockquoteEl extends ArchitectTextEl {
  name = 'blockquote';
  html = `<blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.</p><footer>Someone famous in <cite title="Source Title">Source Title</cite></footer></blockquote>`;
  contentCategories = ['flow', 'sectioning root'];
  allowedContent = ['flow'];
  category = 'typography';
  icon = (<FormatQuoteIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'BLOCKQUOTE';
  }
}

export class ListItemEl extends ArchitectTextEl {
  name = 'list item';
  html = '<li>A basic list item</li>';
  contentCategories = ['li'];
  allowedContent = ['flow'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'LI';
  }
}

export class UnorderedListEl extends ArchitectElement {
  name = 'unordered list';
  html =
    '<ul><li>List item #1</li><li>List item #2</li><li>List item #3</li><ul>';
  contentCategories = ['flow'];
  allowedContent = ['li'];
  category = 'typography';
  icon = (<FormatListBulletedIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'UL';
  }
}

export class BodyEl extends ArchitectElement {
  name = 'body';
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  contextMenu = false;
  matcher(node: HTMLElement) {
    if (node.nodeName === 'HTML') {
      return node.querySelector('body')!;
    }
    return node.nodeName === 'BODY';
  }
}

export class ButtonEl extends ArchitectTextEl {
  name = 'button';
  html = '<a class="btn btn-success">Click Me</a>';
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'listed',
    'labelable',
    'submittable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = ['phrasing'];
  category = 'buttons';
  icon = (<TouchAppIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'BUTTON' || node.classList.contains('btn');
  }
  controls = [
    new ArchitectElControl({
      label: 'Content',
      type: ElementControlType.Input,
      defaultValue(node) {
        return (node as HTMLInputElement).textContent || '';
      },
      onChange(
        node: HTMLElement,
        value: string,
        options = {lastInSession: true},
      ) {
        mutationState().executeMutation(
          new ReplaceNodeContent(node, node.textContent || '', value),
          options,
        );
      },
    }),
  ];
}

export class DivContainerEl extends ArchitectTextEl {
  name = 'div container';
  html = '<div></div>';
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'layout';
  icon = (<CropLandscapeIcon />);
  matcher(node: HTMLElement) {
    return node.nodeName === 'DIV';
  }
}

export class SectionEl extends ArchitectElement {
  name = 'section';
  html = '<section></section>';
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'SECTION';
  }
}

export class FooterEl extends ArchitectElement {
  name = 'footer';
  html = '<footer></footer>';
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'FOOTER';
  }
}

export class HeaderEl extends ArchitectElement {
  name = 'header';
  html = '<header>Header Text</header>';
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'HEADER';
  }
}

export class HeadingEl extends ArchitectTextEl {
  name = 'heading';
  html = '<h2>Heading</h2>';
  contentCategories = ['heading', 'flow'];
  allowedContent = ['phrasing'];
  category = 'typography';
  icon = (<FormatSizeIcon />);
  controls = [
    new ArchitectElControl({
      label: 'Type',
      type: ElementControlType.Select,
      options: [
        {key: 'H1', value: 'h1'},
        {key: 'H2', value: 'h2'},
        {key: 'H3', value: 'h3'},
        {key: 'H4', value: 'h4'},
        {key: 'H5', value: 'h5'},
        {key: 'H6', value: 'h6'},
      ],
      defaultValue: (node: HTMLElement) => {
        return node.nodeName.toLowerCase() || 'h1';
      },
      onChange: (node: HTMLElement, value: string) => {
        const nodeId = getNodeId(node);
        const executed = mutationState().executeMutation(
          new RenameNode(node, value),
          {lastInSession: true},
        );
        if (executed && nodeId) {
          setSelectedContext(nodeId);
          SelectedElementOverlay.reposition();
        }
      },
    }),
  ];
  matcher(node: HTMLElement) {
    return ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName);
  }
}

export class IconEl extends ArchitectElement {
  name = 'icon';
  html = '<i class="fa fa-star fa-2x"></i>';
  contentCategories = ['flow', 'phrasing'];
  allowedContent = [];
  canDrag = true;
  canEdit = [ElementEditableProp.Settings];
  icon = (<EmojiEmotionsIcon />);
  category = 'typography';
  controls = [
    new ArchitectElControl({
      label: 'Size',
      type: ElementControlType.Select,
      shouldHide: node => {
        return !node || !node.classList.contains('fa');
      },
      options: [
        {key: 'Default', value: 'fa-default'},
        {key: 'Large', value: 'fa-lg'},
        {key: '2x', value: 'fa-2x'},
        {key: '3x', value: 'fa-3x'},
        {key: '4x', value: 'fa-4x'},
        {key: '5x', value: 'fa-5x'},
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
  hiddenClasses = [
    'fa',
    'fa-default',
    'fa-lg',
    'fa-2x',
    'fa-3x',
    'fa-4x',
    'fa-5x',
  ];
  editActions = [
    {
      name: 'Change Icon',
      action: async (node: HTMLElement) => {
        const value = await openIconSelector();
        if (value) {
          const originalClassName = node.getAttribute('class') ?? '';
          const newClassName = originalClassName
            .replace(/fa fa.+?($| )/, `${value} `)
            .replace(/glyphicon glyphicon.+?($| )/, `${value} `)
            .replace(/icon-\w+/g, `${value} `);
          mutationState().executeMutation(
            new ModifyAttributes(node, {
              class: newClassName,
            }),
            {lastInSession: true},
          );
        }
      },
    },
  ];
  matcher(node: HTMLElement) {
    return (
      node.nodeName === 'I' ||
      node.className?.includes('icon-') ||
      node.classList?.contains('svg-inline--fa')
    );
  }
}

export class GenericEl extends ArchitectTextEl {
  name = 'generic';
  contentCategories = ['flow', 'phrasing'];
  allowedContent = [];
  canDrag = false;
  canEdit = [ElementEditableProp.Text, ElementEditableProp.Settings];
  matcher(node: HTMLElement) {
    return ['EM', 'STRONG', 'U', 'S', 'SMALL'].includes(node.nodeName);
  }
}

export class LabelEl extends ArchitectTextEl {
  name = 'label';
  contentCategories = ['fow', 'phrasing'];
  allowedContent = [];
  canDrag = false;
  canEdit = [ElementEditableProp.Text, ElementEditableProp.Settings];
  matcher(node: HTMLElement) {
    return node.nodeName === 'LABEL';
  }
}

export class SvgEl extends ArchitectElement {
  name = 'svg';
  matcher(node: HTMLElement) {
    return node.closest('svg') as unknown as HTMLElement;
  }
}

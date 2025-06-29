import {
  ArchitectElControl,
  ArchitectElement,
  ArchitectTextEl,
  ElementControlType,
  ElementEditableProp,
} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {openUploadWindow} from '@common/uploads/utils/open-upload-window';
import {LabelIcon} from '@common/icons/material/Label';
import {CropPortraitIcon} from '@common/icons/material/CropPortrait';
import {ViewModuleIcon} from '@common/icons/material/ViewModule';
import {PowerInputIcon} from '@common/icons/material/PowerInput';
import {ShortTextIcon} from '@common/icons/material/ShortText';
import {CheckBoxIcon} from '@common/icons/material/CheckBox';
import {ViewListIcon} from '@common/icons/material/ViewList';
import {ViewHeadlineIcon} from '@common/icons/material/ViewHeadline';
import {LinkIcon} from '@common/icons/material/Link';
import {ImageIcon} from '@common/icons/material/Image';
import {VideoLibraryIcon} from '@common/icons/material/VideoLibrary';
import {GridOnIcon} from '@common/icons/material/GridOn';
import {ShowChartIcon} from '@common/icons/material/ShowChart';
import {UnfoldLessIcon} from '@common/icons/material/UnfoldLess';
import {HeaderElIcon} from '@app/editor/elements/icons/header-el-icon';
import {openLinkEditor} from '@app/editor/link-editor-dialog/open-link-editor';
import {ModifyAttributes} from '@app/editor/mutations/attributes/modify-attributes';
import {LinkEditorValue} from '@app/editor/link-editor-dialog/link-editor-value';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {contentEditableStore} from '@app/editor/state/content-editable-store';
import {ViewColumnIcon} from '@common/icons/material/ViewColumn';
import {ReplaceClass} from '@app/editor/mutations/attributes/replace-class';
import {UploadInputType} from '@common/uploads/types/upload-input-config';
import {isAbsoluteUrl} from '@common/utils/urls/is-absolute-url';
import {editorUploadState} from '@app/editor/state/editor-upload-store';
import {HoveredElementOverlay} from '@app/editor/elements/element-overlays/element-overlays';
import {Disk} from '@common/uploads/types/backend-metadata';
import {reloadAccountUsage} from '@app/editor/use-account-usage';
import {getBootstrapData} from '@common/core/bootstrap-data/use-backend-bootstrap-data';
import {mutationState} from '@app/editor/state/mutation-store';

export class PageHeaderEl extends ArchitectElement {
  name = 'page header';
  html = `<div class="page-header"><h1>Example page header <small>Header subtext</small></h1></div>`;
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'typography';
  icon = (<HeaderElIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'page-header');
  }
}

export class ProgressBarEl extends ArchitectElement {
  name = 'progress bar';
  html = `<div class="progress">
<div class="progress-bar" role="progressbar" style="width: 50%" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
</div>`;
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'components';
  icon = (<ShowChartIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    if (hasClass(node, 'progress')) {
      return node;
    } else if (node.parentElement && hasClass(node.parentElement, 'progress')) {
      return node.parentElement;
    }
    return false;
  }
}

export class ListGroupEl extends ArchitectElement {
  name = 'list group';
  html = `<ul class="list-group">
<li class="list-group-item">Cras justo odio</li>
<li class="list-group-item">Dapibus ac facilisis in</li>
<li class="list-group-item">Morbi leo risus</li>
<li class="list-group-item">Porta ac consectetur ac</li>
<li class="list-group-item">Vestibulum at eros</li>
</ul>`;
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'components';
  icon = (<ViewListIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'list-group');
  }
}

export class CardEl extends ArchitectElement {
  name = 'card';
  html = `<div class="card" style="width: 18rem;">
<img src="https://via.placeholder.com/286x160?text=Placeholder%20Image" class="card-img-top" alt="">
<div class="card-body">
<h5 class="card-title">Card title</h5>
<p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
<a href="#" class="btn btn-primary">Go somewhere</a>
</div>
</div>`;
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'components';
  icon = (<CropPortraitIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'card');
  }
}

export class AlertEl extends ArchitectTextEl {
  name = 'alert';
  html = `<div class="alert alert-primary" role="alert">
A simple primary alert—check it out!
</div>`;
  contentCategories = ['flow'];
  allowedContent = ['flow'];
  category = 'layout';
  icon = (<LabelIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'well');
  }
}

export class BadgeEl extends ArchitectTextEl {
  name = 'Badge';
  html = '<span class="label label-success">Success</span>';
  contentCategories = ['flow', 'phrasing'];
  allowedContent = ['phrasing'];
  category = 'typography';
  hiddenClasses = ['label'];
  icon = (<LabelIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'label');
  }
}

export class ButtonGroupEl extends ArchitectElement {
  name = 'button group';
  html = `<div class="btn-group" role="group" aria-label="Basic example">
  <button type="button" class="btn btn-secondary">Left</button>
  <button type="button" class="btn btn-secondary">Middle</button>
  <button type="button" class="btn btn-secondary">Right</button>
</div>`;
  contentCategories = ['flow'];
  allowedContent = ['button'];
  category = 'buttons';
  icon = (<ViewColumnIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'btn-group');
  }
}

export class ButtonToolbarEl extends ArchitectElement {
  name = 'button toolbar';
  html = `<div class="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
  <div class="btn-group mr-2" role="group" aria-label="First group">
    <button type="button" class="btn btn-secondary">1</button>
    <button type="button" class="btn btn-secondary">2</button>
    <button type="button" class="btn btn-secondary">3</button>
    <button type="button" class="btn btn-secondary">4</button>
  </div>
  <div class="btn-group mr-2" role="group" aria-label="Second group">
    <button type="button" class="btn btn-secondary">5</button>
    <button type="button" class="btn btn-secondary">6</button>
    <button type="button" class="btn btn-secondary">7</button>
  </div>
  <div class="btn-group" role="group" aria-label="Third group">
    <button type="button" class="btn btn-secondary">8</button>
  </div>
</div>`;
  contentCategories = ['flow'];
  allowedContent = ['.btn-group'];
  category = 'buttons';
  icon = (<ViewModuleIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'btn-toolbar');
  }
}

// forms

export class InputFieldEl extends ArchitectElement {
  name = 'input field';
  html = '<input type="text" class="form-control" placeholder="Text input">';
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'listed',
    'labelable',
    'submittable',
    'resettable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = [];
  hiddenClasses = ['form-control'];
  category = 'forms';
  icon = (<PowerInputIcon />);
  controls = [
    new ArchitectElControl({
      label: 'Type',
      type: ElementControlType.Select,
      options: [
        {key: 'Text', value: 'text'},
        {key: 'Password', value: 'password'},
        {key: 'Date', value: 'date'},
        {key: 'Email', value: 'email'},
        {key: 'Datetime', value: 'datetime'},
        {key: 'Datetime Local', value: 'datetime-local'},
        {key: 'Month', value: 'month'},
        {key: 'Time', value: 'time'},
        {key: 'Week', value: 'week'},
        {key: 'Number', value: 'number'},
        {key: 'Url', value: 'url'},
        {key: 'Search', value: 'search'},
        {key: 'Tel', value: 'tel'},
        {key: 'Color', value: 'color'},
      ],
      defaultValue(node) {
        return (node as HTMLInputElement).type || this.options![0].value;
      },
      onChange(
        node: HTMLElement,
        value: string,
        options = {lastInSession: true},
      ) {
        mutationState().executeMutation(
          new ModifyAttributes(node, {
            type: value,
          }),
          options,
        );
      },
    }),
    new ArchitectElControl({
      label: 'Placeholder',
      type: ElementControlType.Input,
      defaultValue(node) {
        return (node as HTMLInputElement).placeholder;
      },
      onChange(
        node: HTMLElement,
        value: string,
        options = {lastInSession: true},
      ) {
        mutationState().executeMutation(
          new ModifyAttributes(node, {
            placeholder: value,
          }),
          options,
        );
      },
    }),
  ];
  specificity = 1;
  matcher(node: HTMLElement) {
    const excludedTypes = [
      'button',
      'checkbox',
      'hidden',
      'image',
      'radio',
      'range',
      'reset',
      'submit',
    ];
    return (
      node.nodeName === 'INPUT' &&
      !excludedTypes.includes((node as HTMLInputElement).type)
    );
  }
}

export class TextAreaEl extends ArchitectElement {
  name = 'text area';
  html = '<textarea class="form-control" rows="3"></textarea>';
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'listed',
    'labelable',
    'submittable',
    'resettable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = [];
  hiddenClasses = ['form-control'];
  category = 'forms';
  icon = (<ShortTextIcon />);
  controls = [
    new ArchitectElControl({
      label: 'Text Rows',
      type: ElementControlType.Input,
      inputType: 'number',
      min: 1,
      max: 10,
      defaultValue(node) {
        return node.getAttribute('rows') || '';
      },
      onChange(node: HTMLElement, value: string, options) {
        mutationState().executeMutation(
          new ModifyAttributes(node, {
            rows: value,
          }),
          options,
        );
      },
    }),
    new ArchitectElControl({
      label: 'Placeholder',
      type: ElementControlType.Input,
      defaultValue(node) {
        return (node as HTMLTextAreaElement).placeholder;
      },
      onChange(node: HTMLElement, value: string, options) {
        mutationState().executeMutation(
          new ModifyAttributes(node, {
            placeholder: value,
          }),
          options,
        );
      },
    }),
  ];
  specificity = 1;
  matcher(node: HTMLElement) {
    return node.nodeName === 'TEXTAREA';
  }
}

export class CheckboxEl extends ArchitectElement {
  name = 'checkbox';
  html = `<div class="form-check">
  <input class="form-check-input" type="checkbox" value="" id="flexCheckDefault">
  <label class="form-check-label" for="flexCheckDefault">
    Default checkbox
  </label>
</div>`;
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'listed',
    'labelable',
    'submittable',
    'resettable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = [];
  category = 'forms';
  icon = (<CheckBoxIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'form-check');
  }
}

export class InputGroupEl extends ArchitectElement {
  name = 'input group';
  html = `<div class="input-group input-group-md">
        <div class="input-group-prepend">
          <div class="input-group-text">@</div>
        </div>
        <input type="text" class="form-control" placeholder="Username">
      </div>`;
  contentCategories = ['flow'];
  allowedContent = [];
  controls = [
    new ArchitectElControl({
      label: 'Size',
      type: ElementControlType.Select,
      options: [
        {key: 'Medium', value: 'input-group-md'},
        {key: 'Large', value: 'input-group-lg'},
        {key: 'Small', value: 'input-group-sm'},
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
  category = 'forms';
  icon = (<ViewListIcon />);
  hiddenClasses = [
    'input-group',
    'input-group-md',
    'input-group-lg',
    'input-group-sm',
  ];
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'input-group');
  }
}

export class FormGroupEl extends ArchitectElement {
  name = 'form group';
  html = `<div class="form-group"><label for="email" class="control-label">Email address</label><input type="email" class="form-control" id="email" placeholder="Enter email"></div>`;
  contentCategories = ['flow'];
  allowedContent = [];
  controls = [
    new ArchitectElControl({
      label: 'State',
      type: ElementControlType.Select,
      options: [
        {key: 'None', value: 'state-none'},
        {key: 'Error', value: 'has-error'},
        {key: 'Success', value: 'has-success'},
        {key: 'Warning', value: 'has-warning'},
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
  category = 'forms';
  icon = (<ViewHeadlineIcon />);
  hiddenClasses = [
    'form-group',
    'state-none',
    'has-error',
    'has-success',
    'has-warning',
  ];
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'form-group');
  }
}

export class LinkEl extends ArchitectTextEl {
  name = 'link';
  html = '<a href="#">A simple hyperlink.</a>';
  contentCategories = ['flow', 'phrasing', 'interactive'];
  allowedContent = ['phrasing'];
  category = 'typography';
  icon = (<LinkIcon />);
  specificity = 1;
  editActions = [
    {
      name: 'Change Link',
      action: async (node: HTMLElement) => {
        const value = await openLinkEditor(
          {
            href: node.getAttribute('href') ?? undefined,
            target: node.getAttribute('target') ?? undefined,
            download: node.getAttribute('download') ?? undefined,
          },
          {hideUnlinkPanel: true},
        );
        if (value) {
          mutationState().executeMutation(
            new ModifyAttributes(node, value as LinkEditorValue),
            {
              lastInSession: true,
            },
          );
        }
      },
    },
    {
      name: 'Edit Text',
      action: (node: HTMLElement) => {
        setSelectedContext(node);
        contentEditableStore().startSession();
      },
    },
  ];
  matcher(node: HTMLElement) {
    return node.nodeName === 'A';
  }
}

export class AddonEl extends ArchitectElement {
  name = 'addon';
  canDrag = false;
  contentCategories = ['flow'];
  allowedContent = [];
  canEdit = [ElementEditableProp.Text, ElementEditableProp.Settings];
  hiddenClasses = ['input-group-addon'];
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'input-group-addon');
  }
}

export class SelectEl extends ArchitectElement {
  name = 'select';
  html = `<select class="form-control">
<option>1</option>
<option>2</option>
<option>3</option>
<option>4</option>
<option>5</option>
</select>`;
  contentCategories = [
    'flow',
    'phrasing',
    'interactive',
    'listed',
    'labelable',
    'submittable',
    'resettable',
    'reassociateable',
    'form-associated',
  ];
  allowedContent = [];
  category = 'forms';
  icon = (<UnfoldLessIcon />);
  specificity = 1;
  matcher(node: HTMLElement) {
    return node.nodeName === 'SELECT';
  }
}

export class ImageEl extends ArchitectElement {
  name = 'image';
  html = `<img src="/images/builder/placeholder.svg" class="img-responsive" alt="">`;
  contentCategories = [
    'flow',
    'phrasing',
    'embedded',
    'interactive',
    'form-associated',
  ];
  allowedContent = [];
  category = 'media';
  icon = (<ImageIcon />);
  canEdit = [
    ElementEditableProp.Settings,
    ElementEditableProp.Padding,
    ElementEditableProp.Margin,
    ElementEditableProp.Shadow,
    ElementEditableProp.Border,
  ];
  controls = [
    new ArchitectElControl({
      label: 'Shape',
      type: ElementControlType.Select,
      options: [
        {key: 'Default', value: 'img-default'},
        {key: 'Rounded', value: 'img-rounded'},
        {key: 'Thumbnail', value: 'img-thumbnail'},
        {key: 'Circle', value: 'img-circle'},
      ],
      defaultValue(node: HTMLElement) {
        const val = this.options!.find(o => node.classList.contains(o.value));
        return (val || this.options![0]).value;
      },
      onChange(node: HTMLElement, value: string) {
        const currentSize = this.options?.find(o =>
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
    'img-default',
    'img-responsive',
    'img-rounded',
    'img-thumbnail',
    'img-circle',
  ];
  specificity = 1;
  matcher(node: HTMLElement) {
    return node.nodeName === 'IMG';
  }
  editActions = [
    {
      name: 'Upload image',
      action: async (node: HTMLElement) => {
        const files = await openUploadWindow({
          types: [UploadInputType.image],
        });

        if (files[0]) {
          editorUploadState().uploadSingle(files[0], {
            metadata: {diskPrefix: 'project-assets', disk: Disk.public},
            showToastOnRestrictionFail: true,
            onSuccess: fileEntry => {
              reloadAccountUsage();
              const absoluteUrl = isAbsoluteUrl(fileEntry.url)
                ? fileEntry.url
                : `${getBootstrapData().settings.base_url}/${fileEntry.url}`;
              mutationState().executeMutation(
                new ModifyAttributes(node, {
                  src: absoluteUrl,
                }),
                {lastInSession: true},
              );
              HoveredElementOverlay.hide();
            },
          });
        }
      },
    },
    {
      name: 'Create AI image',
      action: 'aiCreateImage' as const,
    },
  ];
}

export class ResponsiveVideoEl extends ArchitectElement {
  name = 'responsive video';
  html =
    '<div class="embed-responsive embed-responsive-16by9"><iframe class="embed-responsive-item" src="//www.youtube.com/embed/sENM2wA_FTg"></iframe></div>';
  contentCategories = ['flow'];
  allowedContent = [];
  category = 'media';
  icon = (<VideoLibraryIcon />);
  canEdit = [
    ElementEditableProp.Padding,
    ElementEditableProp.Margin,
    ElementEditableProp.Shadow,
    ElementEditableProp.Settings,
  ];
  controls = [
    new ArchitectElControl({
      label: 'Url',
      type: ElementControlType.Input,
      defaultValue(node: HTMLElement) {
        return node.querySelector('iframe')?.src ?? '';
      },
      onChange(
        node: HTMLElement,
        value: string,
        options = {lastInSession: true},
      ) {
        const iframe = node.querySelector('iframe');
        if (iframe) {
          mutationState().executeMutation(
            new ModifyAttributes(iframe, {
              src: value,
            }),
            options,
          );
        }
      },
    }),
  ];
  hiddenClasses = [
    'embed-responsive',
    'embed-responsive-16by9',
    'preview-node',
    'img-responsive',
  ];
  specificity = 1;
  matcher(node: HTMLElement) {
    return node.closest('.embed-responsive') as HTMLElement;
  }
}

export class ImageGridEl extends ArchitectElement {
  name = 'image grid';
  html = `<div class="row image-grid">
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
    <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
      <div class="col-sm-3">
        <a href="#"><img class="img-thumbnail" src="/images/builder/placeholder.svg"></a>
    </div>
</div>`;
  contentCategories = ['flow'];
  allowedContent = [];
  category = 'media';
  icon = (<GridOnIcon />);
  canEdit = [
    ElementEditableProp.Padding,
    ElementEditableProp.Margin,
    ElementEditableProp.Shadow,
    ElementEditableProp.Settings,
  ];
  specificity = 1;
  matcher(node: HTMLElement) {
    return hasClass(node, 'image-grid');
  }
}

import {
  ArchitectElControl,
  ArchitectElement,
  ArchitectTextEl,
  ElementControlType,
} from '../architect-element';
import {BorderAllIcon} from '@common/icons/material/BorderAll';
import {ReplaceClass} from '@app/editor/mutations/attributes/replace-class';
import {mutationState} from '@app/editor/state/mutation-store';

const template = `<table class="table">
  <thead>
    <tr>
      <th>#</th>
      <th>First Name</th>
      <th>Last Name</th>
      <th>Username</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>Mark</td>
      <td>Otto</td>
      <td>@mdo</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Jacob</td>
      <td>Thornton</td>
      <td>@fat</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Larry</td>
      <td>the Bird</td>
      <td>@twitter</td>
    </tr>
  </tbody>
</table>`;

const style = `
.jumbotron {
    text-align: center;
}

.jumbotron p {
    margin: 20px 0 30px;
}
`;

export class TableEl extends ArchitectElement {
  name = 'table';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['coption', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr'];
  category = 'typography';
  icon = (<BorderAllIcon />);
  specificity = 3;
  hiddenClasses = ['table'];
  controls = [
    new ArchitectElControl({
      label: 'Type',
      type: ElementControlType.Select,
      options: [
        {key: 'Basic', value: 'default'},
        {key: 'Striped', value: 'table-striped'},
        {key: 'Bordered', value: 'table-bordered'},
        {key: 'Hover', value: 'table-hover'},
        {key: 'Condensed', value: 'table-condensed'},
        {key: 'Responsive', value: 'table-responsive'},
      ],
      defaultValue(node: HTMLElement) {
        const val = this.options!.find(o => node.classList.contains(o.value));
        return (val || this.options![0]).value;
      },
      onChange(node: HTMLElement, value: string) {
        const currentType = this.options!.find(o =>
          node.classList.contains(o.value),
        )?.value;
        mutationState().executeMutation(
          new ReplaceClass(node, value, currentType ?? ''),
          {lastInSession: true},
        );
      },
    }),
  ];
  matcher(node: HTMLElement) {
    return node.nodeName === 'TABLE';
  }
}

export class TheadEl extends ArchitectTextEl {
  name = 'table head';
  html = '<tr>Table row content</tr>';
  contentCategories = ['thead'];
  allowedContent = ['tr'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'THEAD';
  }
}

export class TbodyEl extends ArchitectTextEl {
  name = 'table body';
  html = '<tr>Table row content</tr>';
  contentCategories = ['tbody'];
  allowedContent = ['tr'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'TBODY';
  }
}

export class TrEl extends ArchitectTextEl {
  name = 'table row';
  html = '<tr>Table row content</tr>';
  contentCategories = ['tr', 'th'];
  allowedContent = ['td'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'TR' || node.nodeName === 'TH';
  }
}

export class TdEl extends ArchitectTextEl {
  name = 'table data cell';
  html = '<tr>Table data cell content</tr>';
  contentCategories = ['td'];
  allowedContent = ['flow'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'TD';
  }
}

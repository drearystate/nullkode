import {
  ArchitectElControl,
  ArchitectElement,
  ElementControlType,
} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {MenuIcon} from '@common/icons/material/Menu';
import {ReplaceClass} from '@app/editor/mutations/attributes/replace-class';
import {mutationState} from '@app/editor/state/mutation-store';

const template = `<nav class="navbar navbar-expand-lg navbar-light bg-light">
<a class="navbar-brand" href="#">Architect</a>
<button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
<span class="navbar-toggler-icon"></span>
</button>

<div class="collapse navbar-collapse" id="navbarSupportedContent">
<ul class="navbar-nav mr-auto">
<li class="nav-item active">
<a class="nav-link" href="#">Home <span class="sr-only">(current)</span></a>
</li>
<li class="nav-item">
<a class="nav-link" href="#portfolio">Portfolio</a>
</li>
<li class="nav-item">
<a class="nav-link" href="#about">About Us</a>
</li>
<li class="nav-item">
<a class="nav-link" href="#team">Team</a>
</li>
<li class="nav-item dropdown">
<a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
Dropdown
</a>
<div class="dropdown-menu" aria-labelledby="navbarDropdown">
<a class="dropdown-item" href="#">Action</a>
<a class="dropdown-item" href="#">Another action</a>
<div class="dropdown-divider"></div>
<a class="dropdown-item" href="#">Something else here</a>
</div>
</li>
</ul>
</div>
</nav>`;

export class NavbarEl extends ArchitectElement {
  name = 'navbar';
  contentCategories = ['flow'];
  html = template;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<MenuIcon />);
  specificity = 3;
  hiddenClasses = ['navbar', 'navbar-default', 'navbar-fixed-top'];
  controls = [
    new ArchitectElControl({
      label: 'Type',
      type: ElementControlType.Select,
      options: [
        {key: 'default', value: 'navbar-default'},
        {key: 'fixed top', value: 'navbar-fixed-top'},
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
    return hasClass(node, 'navbar');
  }
}

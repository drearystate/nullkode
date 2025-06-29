import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {LiveHelpIcon} from '@common/icons/material/LiveHelp';

const template = `<div class="services-list">
<div class="row">
    <div class="col-lg-3 col-md-6">
        <div class="service-box">
            <div class="service-icon"><i class="fa fa-lightbulb-o"></i></div>
            <h4>Generating ideas</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
        </div>
    </div>

    <div class="col-lg-3 col-md-6">
       <div class="service-box">
            <div class="service-icon"><i class="fa fa-keyboard-o"></i></div>
            <h4>Prototype Model</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
       </div>
    </div>

    <div class="col-lg-3 col-md-6">
       <div class="service-box">
            <div class="service-icon"><i class="fa fa-code"></i></div>
            <h4>Design and Code</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
       </div>
    </div>

    <div class="col-lg-3 col-md-6">
        <div class="service-box">
            <div class="service-icon"><i class="fa fa-rocket"></i></div>
            <h4>Launching and Monitoring</h4>
            <p class="text-center">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam pulvinar velit nulla. Curabitur ullamcorper quis nisi nec aliquam. Quisque interdum efficitur augue.</p>
        </div>
    </div>
</div>
</div>`;

const style = `
.services-list {
    text-align: center;
    background-color: #FCFCFC;
    padding: 30px;
    border: 1px solid #e0eded;
}

.services-list .service-box {
    background-color: #fff;
    border: 1px solid #e0eded;
    padding: 15px 0;
}

.services-list .service-icon {
    text-align: center;
    padding: 10px 0;
}

.services-list .fa {
    font-size: 64px;
}
`;

export class ServiceListEl extends ArchitectElement {
  name = 'service list';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<LiveHelpIcon />);
  specificity = 3;
  hiddenClasses = ['services-list'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'services-list');
  }
}

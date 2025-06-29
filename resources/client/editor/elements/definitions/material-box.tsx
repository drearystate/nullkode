import {ArchitectElement} from '../architect-element';
import {hasClass} from '../../utils/has-class';
import {PhotoSizeSelectLargeIcon} from '@common/icons/material/PhotoSizeSelectLarge';

const template = `<div class="container">
  <div class="row">
    <div class="material-box col-xs-12 col-sm-6 col-md-6 col-lg-6">
      <div class="box">
        <div class="box-icon">
          <span class="fa fa-4x fa-html5"></span>
        </div>
        <div class="info">
          <h4 class="text-center">Title</h4>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti atque, tenetur quam
            aspernatur corporis at explicabo nulla dolore necessitatibus doloremque exercitationem
            sequi dolorem architecto perferendis quas aperiam debitis dolor soluta!
          </p>
          <a href="" class="btn">Link</a>
        </div>
      </div>
    </div>

    <div class="material-box col-xs-12 col-sm-6 col-md-6 col-lg-6">
      <div class="box">
        <div class="box-icon">
          <span class="fa fa-4x fa-css3"></span>
        </div>
        <div class="info">
          <h4 class="text-center">Title</h4>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Corrupti atque, tenetur quam
            aspernatur corporis at explicabo nulla dolore necessitatibus doloremque exercitationem
            sequi dolorem architecto perferendis quas aperiam debitis dolor soluta!
          </p>
          <a href="" class="btn">Link</a>
        </div>
      </div>
    </div>
  </div>
</div>`;

const style = `
.material-box .box {
  border-radius: 3px;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
  padding: 10px 25px;
  text-align: right;
  display: block;
  margin-top: 60px;
}
.material-box .box-icon {
  background-color: #57a544;
  border-radius: 50%;
  display: table;
  height: 100px;
  margin: 0 auto;
  width: 100px;
  margin-top: -61px;
}
.material-box .box-icon span {
  color: #fff;
  display: table-cell;
  text-align: center;
  vertical-align: middle;
}
.material-box .info h4 {
  font-size: 26px;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.material-box .info > p {
  color: #717171;
  font-size: 16px;
  padding-top: 10px;
  text-align: justify;
}
.material-box .info > a {
  background-color: #03a9f4;
  border-radius: 2px;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
  color: #fff;
  transition: all 0.5s ease 0s;
}
.material-box .info > a:hover {
  background-color: #0288d1;
  box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.16), 0 2px 5px 0 rgba(0, 0, 0, 0.12);
  color: #fff;
  transition: all 0.5s ease 0s;
}
`;

export class MaterialBoxEl extends ArchitectElement {
  name = 'material box';
  contentCategories = ['flow'];
  html = template;
  css = style;
  allowedContent = ['flow'];
  category = 'components';
  icon = (<PhotoSizeSelectLargeIcon />);
  specificity = 3;
  hiddenClasses = ['material-box'];
  matcher(node: HTMLElement) {
    return hasClass(node, 'material-box');
  }
}

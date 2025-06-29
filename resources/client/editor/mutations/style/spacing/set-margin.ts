import {SetStyle} from '../set-style';
import {message} from '@common/i18n/message';

export class SetMargin extends SetStyle {
  displayName = message('Changed margin');
  constructor(
    private margin: string,
    el: HTMLElement,
  ) {
    super({margin}, el);
  }
}

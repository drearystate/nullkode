import {SetStyle} from '../set-style';
import {message} from '@common/i18n/message';

export class SetTextShadow extends SetStyle {
  displayName = message('Changed text shadow');
  constructor(
    private shadow: string,
    el: HTMLElement,
  ) {
    super({textShadow: shadow}, el);
  }
}

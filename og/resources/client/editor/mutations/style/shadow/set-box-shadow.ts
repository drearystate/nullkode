import {SetStyle} from '../set-style';
import {message} from '@common/i18n/message';

export class SetBoxShadow extends SetStyle {
  displayName = message('Changed box shadow');
  constructor(
    private shadow: string,
    el: HTMLElement,
  ) {
    super({boxShadow: shadow}, el);
  }
}

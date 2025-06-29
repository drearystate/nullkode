import {SetStyle} from '../set-style';
import {message} from '@common/i18n/message';

export class SetPadding extends SetStyle {
  displayName = message('Changed padding');
  constructor(
    private padding: string,
    el: HTMLElement,
  ) {
    super({padding}, el);
  }
}

import {message} from '@common/i18n/message';
import {SetStyle} from '@app/editor/mutations/style/set-style';

export class SetOpacity extends SetStyle {
  displayName = message('Changed opacity');
  constructor(
    private opacity: string,
    el: HTMLElement,
  ) {
    super({opacity}, el);
  }
}

import {SetStyle} from '../set-style';
import {message} from '@common/i18n/message';
import {CssStyle} from '@app/editor/mutations/style/css-style';

export class SetTextStyle extends SetStyle {
  displayName = message('Changed text style');
  constructor(
    protected newProps: Partial<CssStyle> = {},
    el: HTMLElement,
  ) {
    super(newProps, el);
  }

  protected executeMutation(doc: Document) {
    return this.setStyleProps(doc, this.changes.new);
  }

  protected undoMutation(doc: Document) {
    return this.setStyleProps(doc, this.changes.old);
  }
}

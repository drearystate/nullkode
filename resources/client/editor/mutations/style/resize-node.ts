import {SetStyle} from './set-style';
import {message} from '@common/i18n/message';

interface ResizeProps {
  width: string;
  height: string;
  maxWidth?: string;
  maxHeight?: string;
}

export class ResizeNode extends SetStyle {
  displayName = message('Changed size');
  constructor(
    protected newProps: ResizeProps,
    el: HTMLElement,
  ) {
    super(newProps, el);
  }

  protected onBeforeExecute() {
    this.newProps.maxHeight = 'none';
    this.newProps.maxWidth = 'none';
    super.onBeforeExecute();
  }
}

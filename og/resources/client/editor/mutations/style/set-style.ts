import {BaseMutation} from '../base-mutation';
import {CssKey, CssStyle, DEFAULT_CSS_VALUES} from './css-style';
import {styleEquals} from '../../utils/style-equals';

export abstract class SetStyle extends BaseMutation {
  changes: {new: CssStyle; old: CssStyle} = {new: {}, old: {}};
  constructor(
    newProps: CssStyle = {},
    protected el: HTMLElement,
  ) {
    super(el);
    this.changes.new = newProps;
  }

  protected onBeforeExecute() {
    if (this.pageDoc) {
      const el = this.findEl(this.pageDoc);
      if (el) {
        this.changes.old = {};
        Object.keys(this.changes.new).forEach(x => {
          const key = x as CssKey;
          this.changes.old[key] = el.style[key] as any;
        });
      }
    }
  }

  protected executeMutation(doc: Document) {
    return this.setStyleProps(doc, this.changes.new);
  }

  protected undoMutation(doc: Document) {
    return this.setStyleProps(doc, this.changes.old);
  }

  protected setStyleProps(doc: Document, props: CssStyle) {
    const el = this.findEl(doc);
    if (el) {
      return Object.keys(props)
        .map(x => {
          const key = x as CssKey;
          const value = props[key] ?? '';
          if (styleEquals(el, key, value)) {
            return false;
          }
          el.style[key] = this.isDefaultValue(key, value) ? '' : value;
          return true;
        })
        .some(changed => changed);
    }
    return false;
  }

  private isDefaultValue(
    prop: CssKey,
    value: string | null | undefined,
  ): boolean {
    return DEFAULT_CSS_VALUES[prop] === value;
  }
}

import {BaseMutation} from '../base-mutation';
import {message} from '@common/i18n/message';
import {
  classToHiddenOnValue,
  hiddenOnValueToClassList,
  ResponsiveHiddenOnValue,
} from '@app/editor/editor-sidebar/inspector-panel/visibility-editor/hidden-on-handler';
import {editorState} from '@app/editor/state/editor-store';

export class ChangeVisibility extends BaseMutation {
  displayName = message('Changed visibility');
  changes: {new: ResponsiveHiddenOnValue; old: ResponsiveHiddenOnValue} = {
    new: {sm: false, md: false, lg: false, xl: false},
    old: {sm: false, md: false, lg: false, xl: false},
  };
  protected display = 'block';

  constructor(
    protected el: HTMLElement,
    protected value: ResponsiveHiddenOnValue,
  ) {
    super(el);
    this.changes.new = value;
  }

  protected onBeforeExecute() {
    this.changes.old = classToHiddenOnValue(Array.from(this.el.classList));
    this.display =
      editorState().getEditorWindow().getComputedStyle(this.el).display ||
      'block';
  }

  protected executeMutation(doc: Document): boolean {
    return this.syncClasses(doc, this.changes.new);
  }

  protected undoMutation(doc: Document): boolean {
    return this.syncClasses(doc, this.changes.old);
  }

  protected syncClasses(
    doc: Document,
    value: ResponsiveHiddenOnValue,
  ): boolean {
    const el = this.findEl(doc);

    if (el) {
      // get all classes that are not display utility classes
      const otherClasses = Array.from(el.classList).filter(className => {
        const regex = new RegExp(`d-(sm|md|lg|xl)-[a-z\-]+$`);
        return className !== 'd-none' && !regex.test(className);
      });

      const classes = hiddenOnValueToClassList(value, this.display);

      const newClassName = `${otherClasses.join(' ')} ${classes.join(' ')}`;
      if (newClassName !== el.className) {
        el.className = newClassName;
        return true;
      }
    }

    return false;
  }
}

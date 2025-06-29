import {getScrollTop} from '@app/editor/utils/get-scroll-top';
import {editorState} from '@app/editor/state/editor-store';

const wheelListener = (e: WheelEvent) => {
  editorState().getEditorDoc().documentElement.scrollTop += e.deltaY;
};

export const EditorDragScroller = new (class {
  protected scrollDownTimeout: any | undefined;
  protected scrollUpTimeout: any | undefined;
  protected editorHeight = 0;

  start() {
    this.editorHeight =
      editorState().getEditorDoc().documentElement.offsetHeight;
    editorState().getEditorWindow().addEventListener('wheel', wheelListener);
  }

  scroll(y: number) {
    const scrollTop = getScrollTop(editorState().getEditorDoc());
    const pointY = y + scrollTop;

    if (pointY - scrollTop <= 80) {
      this.scrollUp();
    } else if (pointY > scrollTop + this.editorHeight - 80) {
      this.scrollDown();
    } else {
      this.stopScrolling();
    }
  }

  stop() {
    this.editorHeight = 0;
    editorState().getEditorWindow().removeEventListener('wheel', wheelListener);
    this.stopScrolling();
  }

  protected scrollUp() {
    clearInterval(this.scrollUpTimeout);
    this.scrollUpTimeout = setInterval(() => {
      this.setScrollTop(getScrollTop(editorState().getEditorDoc()) - 40);
    }, 40);
  }

  protected scrollDown() {
    clearInterval(this.scrollDownTimeout);
    this.scrollDownTimeout = setInterval(() => {
      this.setScrollTop(getScrollTop(editorState().getEditorDoc()) + 40);
    }, 40);
  }

  protected stopScrolling() {
    clearInterval(this.scrollDownTimeout);
    clearInterval(this.scrollUpTimeout);
  }

  protected setScrollTop(newScrollTop: number) {
    newScrollTop = Math.max(0, newScrollTop);
    editorState().getEditorDoc().documentElement.scrollTop = newScrollTop;
  }
})();

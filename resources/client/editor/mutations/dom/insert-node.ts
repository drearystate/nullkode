import {BaseMutation} from '../base-mutation';
import {getNodeId} from '../../utils/get-node-id';
import {insertNodeAtIndex} from '../../utils/insert-node-at-index';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {addIdToNode} from '../../utils/add-id-to-node';
import {message} from '@common/i18n/message';
import {setSelectedContext} from '@app/editor/state/set-selected-context';
import {editorState} from '@app/editor/state/editor-store';

export class InsertNode extends BaseMutation {
  displayName = message('Insert element');
  protected changes: {new: unknown; old: unknown} = {new: null, old: null};

  constructor(
    protected el: HTMLElement,
    protected newIndex: number,
    protected newParent: string,
  ) {
    super(el);
  }

  static canInsertInto(el: HTMLElement): boolean {
    return el && !nodeOrParentEditable(el) && el.nodeName !== 'HTML';
  }

  getNodeId(): string | null {
    return this.nodeId;
  }

  protected onBeforeExecute() {
    if (!this.nodeId) {
      addIdToNode(this.el, true);
    }
    this.nodeId = getNodeId(this.el)!;
  }

  protected executeMutation(doc: Document): boolean {
    const parentEl = this.findEl(doc, this.newParent);
    if (!parentEl || !InsertNode.canInsertInto(parentEl)) {
      return false;
    }
    insertNodeAtIndex(this.el, parentEl, this.newIndex, true);
    
    if (doc === this.previewDoc) {
      setSelectedContext(this.nodeId);
    }
    return true;
  }

  protected undoMutation(doc: Document): boolean {
    const el = this.findEl(doc);
    if (!el || !el.parentNode) {
      return false;
    }
    el.parentNode.removeChild(el);
    return true;
  }

  private isGameElement(element: HTMLElement): boolean {
    const gameClasses = [
      'game-2048', 'snake-game', 'memory-game', 'tetris-game', 
      'breakout-game', 'tic-tac-toe-game', 'simon-says-game',
      'minesweeper-game', 'hangman-game', 'rock-paper-scissors-game'
    ];
    return gameClasses.some(cls => element.classList.contains(cls));
  }
} 
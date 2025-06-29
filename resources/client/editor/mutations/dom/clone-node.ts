import {BaseMutation} from '../base-mutation';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {message} from '@common/i18n/message';
import {nanoid} from 'nanoid';
import {setSelectedContext} from '@app/editor/state/set-selected-context';

export class CloneNode extends BaseMutation {
  displayName = message('Clone element');
  protected cloneId: string;
  protected changes: {new: unknown; old: unknown} = {new: null, old: null};

  constructor(nodeId: string) {
    super(nodeId);
    this.cloneId = nanoid(12);
  }

  protected executeMutation(doc: Document): boolean {
    const el = this.findEl(doc);
    if (!el || !CloneNode.canClone(el)) {
      return false;
    }
    const clone = el.cloneNode(true) as HTMLElement;
    clone.dataset.arId = this.cloneId;
    el.after(clone);
    
    if (doc === this.previewDoc) {
      setSelectedContext(this.cloneId);
    }
    return true;
  }

  protected undoMutation(doc: Document): boolean {
    const clone = this.findEl(doc, this.cloneId);
    if (!clone || !clone.parentNode) {
      return false;
    }
    clone.parentNode.removeChild(clone);
    return true;
  }

  static canClone(el: HTMLElement): boolean {
    return el && !nodeOrParentEditable(el) && el.nodeName !== 'HTML';
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
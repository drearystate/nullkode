import {BaseMutation} from '../base-mutation';
import {nodeOrParentEditable} from '../../utils/node-or-parent-editable';
import {message} from '@common/i18n/message';

export class ReplaceNodeContent extends BaseMutation {
  displayName = message('Replace content');
  protected changes: {new: string; old: string};

  constructor(
    nodeId: string,
    protected newContent: string,
  ) {
    super(nodeId);
    this.changes = {
      new: newContent,
      old: '', // Will be set when we first get the element
    };
  }

  protected executeMutation(doc: Document): boolean {
    return this.replaceContent(doc, this.newContent);
  }

  protected undoMutation(doc: Document): boolean {
    return this.replaceContent(doc, this.changes.old);
  }

  protected replaceContent(doc: Document, content: string): boolean {
    const el = this.findEl(doc);
    if (!el || !this.canReplace(el)) {
      return false;
    }

    // Store original content if not set yet
    if (this.changes.old === '') {
      this.changes.old = el.innerHTML;
    }

    el.innerHTML = content;
    return true;
  }

  private canReplace(el: HTMLElement): boolean {
    return !nodeOrParentEditable(el);
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
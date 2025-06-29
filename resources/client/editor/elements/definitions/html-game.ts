import {ArchitectElement} from '../architect-element';
import {GamepadIcon} from '@common/icons/material/Gamepad';
import React from 'react';

interface EmbedGame {
  title: string;
  type: 'embed';
  user: string;
  hash: string;
}

interface LocalGame {
  title: string;
  type: 'local';
  path: string;
}

type Game = EmbedGame | LocalGame;

export class HtmlGameEl extends ArchitectElement {
  name = 'HTML Game';
  category = 'games';
  icon = React.createElement(GamepadIcon);
  
  static games: Record<string, Game> = {
    'crossy-road': {
      title: 'Crossy Road',
      type: 'embed',
      user: 'CodePen',  // Replace with actual CodePen username
      hash: 'HASH'      // Replace with actual CodePen hash
    },
    'cube': {
      title: 'The Cube',
      type: 'embed',
      user: 'bsehovac',
      hash: 'EMyWVv'
    },
    'tower': {
      title: 'Tower Blocks',
      type: 'embed',
      user: 'ste-vg',
      hash: 'ZEWaXM'
    },
    'airplane': {
      title: '3D Airplane Combat',
      type: 'local',
      path: 'airplane/plane.html'
    }
    // Add more games here as needed
  };

  static config = {
    game: {
      type: 'select',
      options: [
        {key: 'crossy-road', value: 'Crossy Road'},
        {key: 'cube', value: 'The Cube - 3D Rubiks Cube'},
        {key: 'tower', value: 'Tower Blocks - Stack Building Game'},
        {key: 'airplane', value: '3D Airplane Combat - Shoot & Fly'}
      ]
    }
  };

  html = `<div class="game-container"></div>`;
  contentCategories = ['flow'];
  allowedContent = [];

  matcher(node: HTMLElement) {
    return node.classList.contains('game-container');
  }

  protected init() {
    const selectedGame = (this as any).props?.game || 'cube';
    const game = HtmlGameEl.games[selectedGame];
    
    const container = (this as any).node as HTMLElement;
    if (container) {
      if (game.type === 'embed') {
        container.innerHTML = `
          <p class="codepen" data-height="480" data-theme-id="dark" data-default-tab="result" 
             data-slug-hash="${game.hash}" data-user="${game.user}" style="height: 480px; width: 100%; 
             box-sizing: border-box; display: flex; align-items: center; justify-content: center; 
             border: 2px solid; margin: 1em 0; padding: 1em;"></p>
          <script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>
        `;
      } else {
        // Local games will be in the /games/local/ directory
        container.innerHTML = `
          <iframe 
            src="/games/local/${game.path}"
            style="width: 100%; height: 600px; border: none; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            loading="lazy"
            title="${game.title}"
          ></iframe>
        `;
      }
    }
  }
} 
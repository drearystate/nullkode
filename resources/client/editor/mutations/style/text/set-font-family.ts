import {message} from '@common/i18n/message';
import {FontConfig} from '@common/http/value-lists';
import {BaseMutation} from '@app/editor/mutations/base-mutation';
import {editorState} from '@app/editor/state/editor-store';
import {loadFonts} from '@common/ui/font-picker/load-fonts';
import {getNodeId} from '@app/editor/utils/get-node-id';
import {nanoid} from 'nanoid';

interface Changes {
  new: FontConfig;
  old: FontConfig;
}

export class SetFontFamily extends BaseMutation {
  displayName = message('Changed font family');

  protected changes: Changes = {
    new: {family: ''},
    old: {family: ''},
  };

  constructor(node: HTMLElement, newFont: FontConfig) {
    super(node);
    this.changes.new = newFont;
    this.changes.old = {
      family: editorState().getEditorWindow().getComputedStyle(node).fontFamily,
    };
  }

  protected executeMutation(doc: Document) {
    const node = this.findEl(doc);

    if (node) {
      setFont(node, this.changes.new);
      loadFonts([this.changes.new], {
        id: getNodeId(node) || nanoid(),
        document: doc,
        weights: [400, 500, 600, 700],
      });
      return true;
    }
    return false;
  }

  protected undoMutation(doc: Document) {
    const node = this.findEl(doc);
    if (node) {
      setFont(node, this.changes.old);
      return true;
    }
    return false;
  }
}

function setFont(node: HTMLElement, font: FontConfig) {
  node.style.fontFamily = font.family;

  if (font.google) {
    node.dataset.fontType = 'google';
  } else {
    delete node.dataset.fontType;
  }

  if (font.category) {
    node.dataset.fontCategory = font.category;
  } else {
    delete node.dataset.fontCategory;
  }
}

export function removeUnusedGoogleFontTags() {
  const docs = [editorState().getEditorDoc(), editorState().getActivePageDoc()];
  docs.forEach(doc => {
    const usedFonts = new Set<string>();
    if (doc) {
      doc.querySelectorAll('[data-font-type="google"]').forEach(node => {
        const fontFamily = (node as HTMLElement).style.fontFamily.replace(
          /['"]/g,
          '',
        );
        usedFonts.add(fontFamily);
      });

      doc.head.querySelectorAll('[id^="be-fonts-"]').forEach(node => {
        const url = (node as HTMLLinkElement).href;
        const regex = /family=([^:]+)/;
        const match = url.match(regex);
        if (match && match[1]) {
          const fontName = decodeURIComponent(match[1]);
          if (!usedFonts.has(fontName)) {
            node.remove();
          }
        }
      });
    }
  });
}

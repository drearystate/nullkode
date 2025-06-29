import {SetStyle} from './set-style';
import {message} from '@common/i18n/message';
import {isAbsoluteUrl} from '@common/utils/urls/is-absolute-url';
import {urlFromBackgroundImage} from '@common/background-selector/bg-config-from-css-props';
import {getBootstrapData} from '@common/core/bootstrap-data/use-backend-bootstrap-data';
import {CssStyle} from '@app/editor/mutations/style/css-style';

export class SetBackground extends SetStyle {
  displayName = message('Changed background');

  protected setStyleProps(doc: Document, props: CssStyle) {
    const el = this.findEl(doc);
    if (el) {
      for (const key in props) {
        // handle background clip style
        if (key === 'backgroundClip') {
          if (props[key] === 'text') {
            el.dataset.arColorBeforeClip = el.style.color;
            props['color'] = 'transparent';
          } else if (el.dataset.arColorBeforeClip) {
            props['color'] = el.dataset.arColorBeforeClip;
            delete el.dataset.arColorBeforeClip;
          }
        }
        if (key === 'backgroundImage') {
          props[key] = maybePrefixBgUrl(props[key]);
        }
      }
    }
    return super.setStyleProps(doc, props);
  }
}

function maybePrefixBgUrl(bgImage: string | undefined): string | undefined {
  if (bgImage?.includes('url(')) {
    const bgUrl = urlFromBackgroundImage(bgImage);
    if (!isAbsoluteUrl(bgUrl)) {
      return `url(${getBootstrapData().settings.base_url}/${bgUrl})`;
    }
  }
  return bgImage;
}

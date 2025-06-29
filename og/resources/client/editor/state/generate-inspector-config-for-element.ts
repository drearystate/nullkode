import {editorState} from '@app/editor/state/editor-store';
import {FontConfig} from '@common/http/value-lists';
import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';
import {BaseColorBg} from '@common/background-selector/color-backgrounds';
import {bgConfigFromCssProps} from '@common/background-selector/bg-config-from-css-props';
import {BaseImageBg} from '@common/background-selector/image-backgrounds';
import {parseCssShadow} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/css-shadow-parser';
import {ShadowEditorValue} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/shadow-editor-value';
import {isInternalClass} from '@app/editor/mutations/attributes/sync-el-classes';
import {ElementContextData} from '@app/editor/elements/element-context-data';
import {
  classToHiddenOnValue,
  ResponsiveHiddenOnValue,
} from '@app/editor/editor-sidebar/inspector-panel/visibility-editor/hidden-on-handler';
import {CssStyle} from '@app/editor/mutations/style/css-style';

type Value = number | string;
export type StyleValueAndUnit = [Value, string];
export type SpacingStyle = [
  StyleValueAndUnit,
  StyleValueAndUnit,
  StyleValueAndUnit,
  StyleValueAndUnit,
];

export interface InspectorElementConfig {
  id: string;
  classList: string[];
  responsiveHiddenOn: ResponsiveHiddenOnValue;
  fontFamily: FontConfig;
  fontSize: StyleValueAndUnit;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  textDecorationLine: string;
  color: string;
  backgroundColor: string;
  backgroundConfig: BackgroundSelectorConfig;
  backgroundClip: string;
  padding: SpacingStyle;
  margin: SpacingStyle;
  shadows: ShadowEditorValue[];
  borderWidth: SpacingStyle;
  borderStyle: CssStyle['borderStyle'];
  opacity: string;
  borderColor: string;
  borderRadius: SpacingStyle;
}

export const defaultSpacingStyles: SpacingStyle = [
  [0, 'px'],
  [0, 'px'],
  [0, 'px'],
  [0, 'px'],
];

export const defaultInspectorElementConfig: InspectorElementConfig = {
  id: '',
  classList: [],
  fontFamily: {family: ''},
  backgroundColor: 'rgb(255, 255, 255)',
  color: 'rgb(0, 0, 0)',
  fontWeight: '400',
  fontStyle: 'normal',
  textAlign: 'left',
  textDecorationLine: 'none',
  opacity: '1',
  responsiveHiddenOn: {
    sm: false,
    md: false,
    lg: false,
    xl: false,
  },
  fontSize: [16, 'px'],
  padding: defaultSpacingStyles,
  margin: defaultSpacingStyles,
  borderWidth: defaultSpacingStyles,
  borderRadius: defaultSpacingStyles,
  borderStyle: 'none',
  shadows: [],
  borderColor: 'rgb(255, 255, 255)',
  backgroundClip: 'border-box',
  backgroundConfig: {
    ...BaseColorBg,
    backgroundColor: 'rgba(0,0,0,0)',
    backgroundImage: 'none',
    color: 'rgb(0,0,0)',
  },
};

const fontWeightMap: Record<string, string> = {
  normal: '400',
  bold: '700',
  bolder: '900',
  lighter: '100',
};

export function generateInspectorConfigForElement(
  ctx: ElementContextData,
): InspectorElementConfig {
  const computedStyle = editorState()
    .getEditorWindow()
    .getComputedStyle(ctx.node);
  const style = ctx.node.style;
  const classList = Array.from(ctx.node.classList);
  if (style) {
    return {
      id: ctx.node.id,
      classList: classList.filter(c => !isInternalClass(c, ctx.el)),
      responsiveHiddenOn: classToHiddenOnValue(classList),
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      backgroundClip: computedStyle.backgroundClip,
      opacity: computedStyle.opacity,
      backgroundConfig:
        bgConfigFromCssProps(computedStyle) ??
        getDefaultBgConfig(computedStyle),
      shadows: [
        ...parseCssShadow(computedStyle.boxShadow),
        ...parseCssShadow(computedStyle.textShadow),
      ],
      fontWeight:
        fontWeightMap[computedStyle.fontWeight] ?? computedStyle.fontWeight,
      fontStyle: computedStyle.fontStyle,
      textAlign: computedStyle.textAlign,
      textDecorationLine: computedStyle.textDecorationLine,
      fontSize: splitValueAndUnit(computedStyle.fontSize),
      fontFamily: {
        family: computedStyle.fontFamily,
        category: ctx.node.dataset.fontCategory,
        google: ctx.node.dataset.fontType === 'google',
      },
      padding: [
        splitValueAndUnit(style.paddingTop),
        splitValueAndUnit(style.paddingRight),
        splitValueAndUnit(style.paddingBottom),
        splitValueAndUnit(style.paddingLeft),
      ],
      margin: [
        splitValueAndUnit(style.marginTop),
        splitValueAndUnit(style.marginRight),
        splitValueAndUnit(style.marginBottom),
        splitValueAndUnit(style.marginLeft),
      ],
      borderWidth: [
        splitValueAndUnit(style.borderTopWidth),
        splitValueAndUnit(style.borderRightWidth),
        splitValueAndUnit(style.borderBottomWidth),
        splitValueAndUnit(style.borderLeftWidth),
      ],
      borderRadius: [
        splitValueAndUnit(computedStyle.borderTopLeftRadius),
        splitValueAndUnit(computedStyle.borderTopRightRadius),
        splitValueAndUnit(computedStyle.borderBottomRightRadius),
        splitValueAndUnit(computedStyle.borderBottomLeftRadius),
      ],
      // always default to solid to simplify border editor and having 'none'
      // as style will hide border completely, so no point in having it at all
      borderStyle:
        style.borderStyle === 'none' || !style.borderStyle
          ? 'solid'
          : (style.borderStyle as CssStyle['borderStyle']),
      borderColor: style.borderColor,
    };
  }
  return defaultInspectorElementConfig;
}

function splitValueAndUnit(cssValue: string): [number | '', string] {
  const matches = cssValue.match(/([\d\.]+)(\D+)/);
  if (matches) {
    return [formatSpacingValue(matches[1]), matches[2]];
  }
  return [0, 'px'];
}

export function formatSpacingValue(value: string | number): number | '' {
  const num = parseInt(value as string);
  if (Number.isNaN(num)) {
    return '';
  }
  return num;
}

function getDefaultBgConfig(
  style: CSSStyleDeclaration,
): BackgroundSelectorConfig {
  return {
    ...BaseImageBg,
    color: style.color,
    backgroundAttachment:
      style.backgroundAttachment as BackgroundSelectorConfig['backgroundAttachment'],
    backgroundSize:
      style.backgroundSize as BackgroundSelectorConfig['backgroundSize'],
    backgroundRepeat:
      style.backgroundRepeat as BackgroundSelectorConfig['backgroundRepeat'],
    backgroundPosition: style.backgroundPosition,
    backgroundImage: style.backgroundImage,
    backgroundColor: style.backgroundColor,
  };
}

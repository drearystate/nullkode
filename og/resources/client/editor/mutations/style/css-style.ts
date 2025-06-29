export interface CssStyle {
  opacity?: string;
  margin?: string;
  padding?: string;
  borderWidth?: string;
  borderRadius?: string;
  borderColor?: string;
  borderStyle?:
    | 'none'
    | 'solid'
    | 'dashed'
    | 'dotted'
    | 'double'
    | 'groove'
    | 'ridge'
    | 'inset'
    | 'outset'
    | 'initial'
    | 'inherit';
  color?: string;
  backgroundColor?: string;
  backgroundClip?: string;
  backgroundImage?: string;
  backgroundPosition?: string;
  backgroundAttachment?: 'scroll' | 'fixed' | 'local' | 'initial' | 'inherit';
  backgroundSize?: 'auto' | 'cover' | 'contain' | 'initial' | 'inherit';
  textDecoration?: string;
  backgroundRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  fontSize?: string;
  textAlign?: 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
  fontStyle?: 'italic' | 'normal';
  fontFamily?: string;
  lineHeight?: string;
  fontWeight?: string;
  textDecorationLine?: string;
  boxShadow?: string;
  textShadow?: string;
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
}

export type CssKey = keyof CssStyle;

export const DEFAULT_CSS_VALUES: CssStyle = {
  backgroundRepeat: 'repeat',
  backgroundPosition: '0% 0%',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundAttachment: 'scroll',
  backgroundSize: 'auto',
  backgroundImage: 'none',
  color: 'rgb(0, 0, 0)',

  // text styles
  fontStyle: 'normal',
  textAlign: 'start',
  textDecoration: 'none solid rgba(0, 0, 0, 0.87)',
  textDecorationLine: 'none',

  // shadow
  boxShadow: 'none',
  textShadow: 'none',

  // border
  borderColor: 'rgba(0, 0, 0, 0.87)',
  borderStyle: 'none',
  borderRadius: '0px',
  borderWidth: '0px',
};

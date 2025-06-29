import {CssKey} from '../mutations/style/css-style';

export function styleEquals(
  node: HTMLElement,
  key: CssKey,
  value: string | null | undefined,
) {
  return window.getComputedStyle(node)[key] === value;
}

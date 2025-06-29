const transparentValues = [
  'transparent',
  'none',
  'rgba(0, 0, 0, 0)',
  'hsla(0, 0%, 0%, 0)',
];

export function isCssColorTransparent(cssColor: string | undefined) {
  return !cssColor || transparentValues.includes(cssColor);
}

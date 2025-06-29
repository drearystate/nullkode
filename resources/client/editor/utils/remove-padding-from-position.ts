interface Position {
  top?: number;
  left: number;
  width: number;
  height?: number;
}

export function removePaddingFromPosition<T extends Position>(
  refNode: HTMLElement,
  position: T,
): T {
  const computedStyle = getComputedStyle(refNode);
  const paddingLeft = parseInt(computedStyle.paddingLeft);
  const paddingRight = parseInt(computedStyle.paddingRight);
  if (paddingLeft || paddingRight) {
    position.width -= paddingLeft + paddingRight;
    position.left += (paddingLeft + paddingRight) / 2;
  }
  return position;
}

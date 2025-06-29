export interface ResponsiveHiddenOnValue {
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
}

const allBreakpoints = ['sm', 'md', 'lg', 'xl'] as const;

export function classToHiddenOnValue(
  classList: string[],
): ResponsiveHiddenOnValue {
  return {
    sm: classList.includes('d-none') && !breakpointIsVisible(classList, 'sm'),
    md:
      hiddenByThisOrSmallerBreakpoint('md', classList) &&
      !breakpointIsVisible(classList, 'md'),
    lg:
      hiddenByThisOrSmallerBreakpoint('lg', classList) &&
      !breakpointIsVisible(classList, 'lg'),
    xl:
      hiddenByThisOrSmallerBreakpoint('xl', classList) &&
      !breakpointIsVisible(classList, 'xl'),
  };
}

// check if this breakpoint is hidden by direct class or any of the smaller breakpoints
function hiddenByThisOrSmallerBreakpoint(
  breakpoint: keyof ResponsiveHiddenOnValue,
  classList: string[],
): boolean {
  if (classList.includes('d-none')) {
    return true;
  }
  if (classList.includes(`d-${breakpoint}-none`)) {
    return true;
  }
  const index = allBreakpoints.indexOf(breakpoint);
  for (let i = 0; i < index; i++) {
    if (classList.includes(`d-${allBreakpoints[i]}-none`)) {
      return true;
    }
  }
  return false;
}

function breakpointIsVisible(
  classList: string[],
  breakpoint: keyof ResponsiveHiddenOnValue,
): boolean {
  const regex = new RegExp(`^d-${breakpoint}-(?!none)[a-z\-]+$`);
  return classList.find(c => regex.test(c)) !== undefined;
}

export function hiddenOnValueToClassList(
  value: ResponsiveHiddenOnValue,
  display = 'block',
): string[] {
  if (!display || display === 'none') {
    display = 'block';
  }

  // all visible
  if (Object.values(value).every(v => !v)) {
    return [];
  }

  // all hidden
  if (Object.values(value).every(v => v)) {
    return ['d-none'];
  }

  const classList: string[] = [];
  Object.entries(value).forEach(([_breakpoint, isHidden]) => {
    const breakpoint = _breakpoint as keyof ResponsiveHiddenOnValue;
    // sm breakpoint is a special case, hidden it needs to prefix, showing it needs to class at all
    if (breakpoint === 'sm') {
      if (isHidden) {
        classList.push('d-none');
      }
    } else {
      if (isHidden) {
        classList.push(`d-${breakpoint}-none`);
      } else {
        classList.push(`d-${breakpoint}-${display}`);
      }
    }
  });

  return classList;
}

import {ReactNode} from 'react';
import clsx from 'clsx';

interface Props {
  isVisible: boolean;
  children?: ReactNode;
  className?: string;
  overlayRef: React.Ref<HTMLDivElement>;
}
export function ElementOverlayLayout({
  isVisible,
  children,
  className,
  overlayRef,
  ...other
}: Props) {
  return (
    <div
      ref={overlayRef}
      className={clsx(
        className,
        isVisible ? 'visible' : 'invisible',
        'element-overlay pointer-events-none absolute left-0 top-0 text-primary-light after:absolute after:inset-1 after:outline',
      )}
      {...other}
    >
      {children}
    </div>
  );
}

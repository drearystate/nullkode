import clsx from 'clsx';
import React, {ReactNode} from 'react';

interface Props {
  className?: string;
  textClassName?: string;
  onClick?: () => void;
  children: ReactNode;
}

export function NewLayoutEditorItemButton({
  className,
  textClassName,
  onClick,
  children,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative isolate block w-full py-6 text-center text-xs before:absolute before:left-0 before:top-1/2 before:z-10 before:h-1 before:w-full before:border before:border-dashed',
        className,
      )}
    >
      <span
        className={clsx(
          'relative z-20 bg px-4 transition-button',
          textClassName,
        )}
      >
        {children}
      </span>
    </button>
  );
}

import React, {ReactNode} from 'react';

interface Props {
  children: ReactNode;
  actions?: ReactNode;
}
export function EditorSidebarHeading({children, actions}: Props) {
  return (
    <div className="flex items-center justify-between gap-10 p-14">
      <h1 className="text-base font-bold">{children}</h1>
      {actions}
    </div>
  );
}

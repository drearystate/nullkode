import {m} from 'framer-motion';
import clsx from 'clsx';
import {forwardRef, Fragment, ReactNode} from 'react';
import {Skeleton} from '@common/ui/skeleton/skeleton';
import {opacityAnimation} from '@common/ui/animation/opacity-animation';

interface Props {
  className?: string;
  children: ReactNode;
  animationKey?: string;
}
export function TemplateGridLayout({className, children, animationKey}: Props) {
  return (
    <m.div
      key={animationKey}
      className={clsx('grid grid-cols-1 gap-20 md:grid-cols-3', className)}
      {...opacityAnimation}
    >
      {children}
    </m.div>
  );
}

interface TemplateGridItemLayoutProps {
  children: ReactNode;
  label: ReactNode;
  className?: string;
}
export const TemplateGridItemLayout = forwardRef<
  HTMLDivElement,
  TemplateGridItemLayoutProps
>(({children, label, className}, ref) => (
  <div
    ref={ref}
    className={clsx(
      'overflow-hidden rounded-panel border border-transparent shadow-md',
      className,
    )}
  >
    {children}
    <div className="mt-4 flex items-center justify-center p-12 text-sm font-semibold capitalize">
      {label}
    </div>
  </div>
));

export function TemplateGridSkeletons() {
  return (
    <Fragment>
      {[...Array(9)].map((_, i) => (
        <TemplateGridItemLayout key={i} label={<Skeleton />}>
          <Skeleton variant="rect" size="aspect-[365/228]" />
        </TemplateGridItemLayout>
      ))}
    </Fragment>
  );
}

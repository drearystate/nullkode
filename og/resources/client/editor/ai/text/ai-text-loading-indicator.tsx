import {Skeleton} from '@common/ui/skeleton/skeleton';
import clsx from 'clsx';

interface Props {
  isVisible: boolean;
}
export function AiTextLoadingIndicator({isVisible}: Props) {
  return (
    <div
      className={clsx(
        'pointer-events-none absolute top-0 w-full bg transition-opacity',
        !isVisible && 'opacity-0',
      )}
    >
      <Skeleton className="max-w-[20%]" />
      <Skeleton className="max-w-[80%]" />
      <Skeleton className="max-w-[40%]" />
      <Skeleton className="max-w-[70%]" />
      <Skeleton />
    </div>
  );
}

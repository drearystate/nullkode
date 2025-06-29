import {SpacingEditorStateReturn} from '@app/editor/editor-sidebar/inspector-panel/spacing-editor/use-spacing-editor-state';
import clsx from 'clsx';

type Part =
  | 'topLeft'
  | 'topRight'
  | 'rightTop'
  | 'rightBottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'leftTop'
  | 'leftBottom';

const edgeVisibleParts: Record<number, Part[]> = {
  0: ['topLeft', 'topRight'],
  1: ['rightTop', 'rightBottom'],
  2: ['bottomLeft', 'bottomRight'],
  3: ['leftTop', 'leftBottom'],
};
const cornerVisibleParts: Record<number, Part[]> = {
  0: ['leftTop', 'topLeft'],
  1: ['topRight', 'rightTop'],
  2: ['rightBottom', 'bottomRight'],
  3: ['bottomLeft', 'leftBottom'],
};

const AllParts = {
  topLeft: TopLeft,
  topRight: TopRight,
  rightTop: RightTop,
  rightBottom: RightBottom,
  bottomLeft: BottomLeft,
  bottomRight: BottomRight,
  leftTop: LeftTop,
  leftBottom: LeftBottom,
};

interface Props {
  valueIndex: 'all' | number;
  state: SpacingEditorStateReturn;
  className?: string;
}
export function SpacingEditorCheckbox({valueIndex, state, className}: Props) {
  const isChecked =
    valueIndex === 'all'
      ? state.enabledValues.length === 4
      : state.enabledValues.includes(valueIndex);
  const partMap =
    state.name === 'borderRadius' ? cornerVisibleParts : edgeVisibleParts;
  return (
    <label
      className={clsx(
        'relative isolate block h-24 w-24 flex-shrink-0',
        className,
      )}
    >
      <input
        className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none"
        type="checkbox"
        checked={isChecked}
        onChange={e =>
          valueIndex === 'all'
            ? state.toggleAllValues(e.target.checked)
            : state.toggleValue(valueIndex, e.target.checked)
        }
      />
      <div className="pointer-events-none relative h-full w-full">
        {Object.entries(AllParts).map(([part, Part]) => (
          <Part
            key={part}
            isChecked={isChecked}
            isVisible={
              valueIndex === 'all' || partMap[valueIndex].includes(part as Part)
            }
          />
        ))}
      </div>
    </label>
  );
}

interface PartProps {
  isChecked: boolean;
  isVisible: boolean;
}
function TopLeft({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute left-0 top-0 w-1/2',
        isVisible ? 'h-2' : 'h-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

function TopRight({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute right-0 top-0 w-1/2',
        isVisible ? 'h-2' : 'h-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

function RightTop({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute right-0 top-0 h-1/2',
        isVisible ? 'w-2' : 'w-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

function RightBottom({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute bottom-0 right-0 h-1/2',
        isVisible ? 'w-2' : 'w-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

function BottomLeft({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute bottom-0 left-0 w-1/2',
        isVisible ? 'h-2' : 'h-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

function BottomRight({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute bottom-0 right-0 w-1/2',
        isVisible ? 'h-2' : 'h-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

function LeftTop({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute left-0 top-0 h-1/2',
        isVisible ? 'w-2' : 'w-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

function LeftBottom({isChecked, isVisible}: PartProps) {
  return (
    <div
      className={clsx(
        'absolute bottom-0 left-0 h-1/2',
        isVisible ? 'w-2' : 'w-1',
        isChecked && isVisible ? 'bg-primary' : 'bg-chip',
      )}
    />
  );
}

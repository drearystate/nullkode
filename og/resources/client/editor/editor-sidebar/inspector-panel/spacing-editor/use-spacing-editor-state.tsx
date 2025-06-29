import {editorState} from '@app/editor/state/editor-store';
import {useCallback, useState} from 'react';
import {useCallbackRef} from '@common/utils/hooks/use-callback-ref';
import {
  formatSpacingValue,
  SpacingStyle,
} from '@app/editor/state/generate-inspector-config-for-element';
import {
  inspectorState,
  useInspectorStore,
} from '@app/editor/state/inspector-store';
import {ExecuteMutationOptions} from '@app/editor/state/mutation-store';

type Value = number | string;

export interface SpacingEditorStateReturn {
  name: Props['name'];
  value: SpacingStyle;
  setConnectedValue: (newValue: Value, options: ExecuteMutationOptions) => void;
  isConnected: boolean;
  setIsConnected: (newValue: boolean) => void;
  setSingleValue: (
    index: number,
    newValue: Value,
    options: ExecuteMutationOptions,
  ) => void;
  setConnectedUnit: (newUnit: string, options: ExecuteMutationOptions) => void;
  setSingleUnit: (
    index: number,
    newUnit: string,
    options: ExecuteMutationOptions,
  ) => void;
  enabledValues: number[];
  toggleValue: (index: number, isChecked: boolean) => void;
  toggleAllValues: (isChecked: boolean) => void;
}

interface Props {
  name: 'padding' | 'margin' | 'borderWidth' | 'borderRadius';
  onMutate: (
    value: string,
    node: HTMLElement,
    options: ExecuteMutationOptions,
  ) => void;
}
export function useSpacingEditorState({
  name,
  onMutate,
}: Props): SpacingEditorStateReturn {
  const mutationCallback = useCallbackRef(onMutate);
  const value = useInspectorStore(s => s.currentConfig[name]);
  const [isConnected, setIsConnected] = useState(true);
  const [enabledValues, setEnabledValues] = useState<number[]>([0, 1, 2, 3]);

  const toggleValue = useCallback((index: number, isChecked: boolean) => {
    if (isChecked) {
      setEnabledValues(prev => [...prev, index]);
    } else {
      setEnabledValues(prev => prev.filter(i => i !== index));
    }
  }, []);

  const toggleAllValues = useCallback((isChecked: boolean) => {
    if (isChecked) {
      setEnabledValues([0, 1, 2, 3]);
    } else {
      setEnabledValues([]);
    }
  }, []);

  const setValueAndMutate = useCallback(
    (
      stateCallback: (prev: SpacingStyle) => SpacingStyle,
      options: ExecuteMutationOptions,
    ) => {
      const prev = inspectorState().currentConfig[name];
      const newValue = stateCallback(prev).map(([value, unit], index) => {
        if (!enabledValues.includes(index)) {
          value = prev[index][0];
          unit = prev[index][1];
        }
        return [formatSpacingValue(value), unit];
      }) as SpacingStyle;
      inspectorState().setValue(name, newValue as SpacingStyle);
      const node = editorState().selectedContext?.node;
      if (node) {
        const shorthand = spacingStyleToShortHand(newValue);
        mutationCallback(shorthand, node, options);
      }
    },
    [mutationCallback, enabledValues, name],
  );

  const setConnectedValue = useCallback(
    (newValue: Value, options: ExecuteMutationOptions) => {
      setValueAndMutate(
        prev => prev.map(([, unit]) => [newValue, unit]) as SpacingStyle,
        options,
      );
    },
    [setValueAndMutate],
  );

  const setConnectedUnit = useCallback(
    (newUnit: string, options: ExecuteMutationOptions) => {
      setValueAndMutate(
        prev => prev.map(([value]) => [value, newUnit]) as SpacingStyle,
        options,
      );
    },
    [setValueAndMutate],
  );

  const setSingleValue = useCallback(
    (index: number, newValue: Value, options: ExecuteMutationOptions) => {
      if (isConnected) {
        setConnectedValue(newValue, options);
      } else {
        setValueAndMutate(
          values =>
            values.map((v, i) =>
              i === index ? [newValue, v[1]] : v,
            ) as SpacingStyle,
          options,
        );
      }
    },
    [isConnected, setConnectedValue, setValueAndMutate],
  );

  const setSingleUnit = useCallback(
    (index: number, newUnit: string, options: ExecuteMutationOptions) => {
      if (isConnected) {
        setConnectedUnit(newUnit, options);
      } else {
        setValueAndMutate(
          values =>
            values.map((v, i) =>
              i === index ? [v[0], newUnit] : v,
            ) as SpacingStyle,
          options,
        );
      }
    },
    [isConnected, setConnectedUnit, setValueAndMutate],
  );

  return {
    name,
    value,
    setConnectedValue,
    isConnected,
    setIsConnected,
    setSingleValue,
    setConnectedUnit,
    setSingleUnit,
    enabledValues,
    toggleValue,
    toggleAllValues,
  };
}

export function spacingStyleToShortHand(value: SpacingStyle): string {
  return value.map(([value, unit]) => `${value || 0}${unit}`).join(' ');
}

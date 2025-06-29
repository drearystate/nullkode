import {create} from 'zustand';
import {
  defaultInspectorElementConfig,
  generateInspectorConfigForElement,
  InspectorElementConfig,
} from '@app/editor/state/generate-inspector-config-for-element';

import {ShadowEditorValue} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/shadow-editor-value';
import {ElementContextData} from '@app/editor/elements/element-context-data';

interface State {
  initialConfig: InspectorElementConfig;
  currentConfig: InspectorElementConfig;
}

const initialState: State = {
  initialConfig: defaultInspectorElementConfig,
  currentConfig: defaultInspectorElementConfig,
};

interface Actions {
  setInitialConfig: (ctx: ElementContextData) => void;
  setValue: <T extends keyof InspectorElementConfig>(
    key: T,
    value: InspectorElementConfig[T],
  ) => void;
  setValues: (values: Partial<InspectorElementConfig>) => void;
  setShadowValue: (
    value: ShadowEditorValue,
    index?: number,
  ) => ShadowEditorValue[];
  removeShadowValue: (index?: number) => ShadowEditorValue[];
  reset: () => void;
}

export const useInspectorStore = create<State & Actions>()((set, get) => {
  return {
    ...initialState,
    reset: () => set(initialState),
    setInitialConfig: (ctx: ElementContextData) => {
      const style = generateInspectorConfigForElement(ctx);
      set({
        initialConfig: style,
        currentConfig: style,
      });
    },
    setValue: (key, value) => {
      set({
        currentConfig: {
          ...get().currentConfig,
          [key]: value,
        },
      });
    },
    setValues: values => {
      set({
        currentConfig: {
          ...get().currentConfig,
          ...values,
        },
      });
    },
    setShadowValue: (value, index) => {
      const shadows = [...get().currentConfig.shadows];
      if (index != null) {
        shadows[index] = value;
      } else {
        shadows.push(value);
      }
      get().setValue('shadows', shadows);
      return get().currentConfig.shadows;
    },
    removeShadowValue: index => {
      const shadows = [...get().currentConfig.shadows];
      if (index == null) {
        index = shadows.length - 1;
      }
      shadows.splice(index, 1);
      get().setValue('shadows', shadows);
      return get().currentConfig.shadows;
    },
  };
});

export function inspectorState() {
  return useInspectorStore.getState();
}

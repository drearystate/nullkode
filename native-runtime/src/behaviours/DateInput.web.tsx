import { createElement } from "react";
import { View } from "react-native";
import type { DateInputProps } from "./DateInput";

/**
 * The browser preview's date / time field: the browser's own
 * <input type=date|time|datetime-local> (same value format as the web app).
 */
export function DateInput({ kind, value, onChange, style, textStyle, min, max, disabled, label, testID }: DateInputProps) {
  const ts = textStyle as Record<string, unknown>;
  return (
    <View style={[style as never, { justifyContent: "center" }]}>
      {createElement("input", {
        type: kind,
        value,
        min,
        max,
        disabled,
        "aria-label": label,
        "data-testid": testID,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
        style: {
          border: 0,
          outline: "none",
          background: "transparent",
          width: "100%",
          height: "100%",
          padding: 0,
          margin: 0,
          font: "inherit",
          color: ts.color as string,
          fontSize: ts.fontSize as number,
          fontFamily: ts.fontFamily as string,
        },
      })}
    </View>
  );
}

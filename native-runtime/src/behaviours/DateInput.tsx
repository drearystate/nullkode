import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import type { NativeApp } from "../spec";
import { themeOf, tr } from "./kit";
import { displayValue, fromFieldValue, toFieldValue, type DateKind } from "./dateValue";

export type DateInputProps = {
  app: NativeApp;
  kind: DateKind;
  value: string;
  onChange: (v: string) => void;
  style: Record<string, unknown>;
  textStyle: Record<string, unknown>;
  placeholderColor?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  label?: string;
  testID?: string;
};

/**
 * A date / time / date-and-time field with the phone's own picker
 * (@react-native-community/datetimepicker, part of Expo Go): Android's
 * dialogs (date, then time), iOS's inline picker in a sheet.
 */
export function DateInput({ app, kind, value, onChange, style, textStyle, placeholderColor, min, max, disabled, label, testID }: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());
  const th = themeOf(app);
  const minimumDate = fromFieldValue(kind, min) ?? undefined;
  const maximumDate = fromFieldValue(kind, max) ?? undefined;
  const placeholder = kind === "time" ? tr(app, "native.chooseTime", "Choose a time") : tr(app, "native.chooseDate", "Choose a date");

  const start = () => {
    const current = fromFieldValue(kind, value) ?? new Date();
    if (Platform.OS === "android") {
      const pickTime = (day: Date) =>
        DateTimePickerAndroid.open({
          value: day,
          mode: "time",
          is24Hour: undefined,
          onChange: (e, t) => {
            if (e.type === "set" && t) onChange(toFieldValue(kind, t));
          },
        });
      DateTimePickerAndroid.open({
        value: current,
        mode: kind === "time" ? "time" : "date",
        minimumDate: kind === "time" ? undefined : minimumDate,
        maximumDate: kind === "time" ? undefined : maximumDate,
        onChange: (e, d) => {
          if (e.type !== "set" || !d) return;
          if (kind === "datetime-local") {
            const day = new Date(d);
            day.setHours(current.getHours(), current.getMinutes(), 0, 0);
            pickTime(day);
          } else onChange(toFieldValue(kind, d));
        },
      });
      return;
    }
    setDraft(current);
    setOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={disabled ? undefined : start}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={value ? { text: displayValue(app, kind, value) } : undefined}
        style={[style as never, { justifyContent: "center" }]}
        testID={testID}
      >
        <Text style={[textStyle as never, !value ? { color: placeholderColor ?? th.muted } : null]} numberOfLines={1}>
          {value ? displayValue(app, kind, value) : placeholder}
        </Text>
      </Pressable>
      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: th.surface }]}>
            <View style={[styles.head, { borderColor: th.border }]}>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
                <Text style={{ color: th.muted, fontSize: 16 }}>{tr(app, "native.cancel", "Cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(toFieldValue(kind, draft));
                  setOpen(false);
                }}
                accessibilityRole="button"
              >
                <Text style={{ color: th.primary, fontSize: 16, fontWeight: "600" }}>{tr(app, "native.done", "Done")}</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode={kind === "datetime-local" ? "datetime" : kind}
              display={kind === "time" ? "spinner" : "inline"}
              minimumDate={kind === "time" ? undefined : minimumDate}
              maximumDate={kind === "time" ? undefined : maximumDate}
              onValueChange={(_e, d) => d && setDraft(d)}
              accentColor={th.primary}
              themeVariant={app.theme.mode === "dark" ? "dark" : "light"}
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: 28, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  head: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});

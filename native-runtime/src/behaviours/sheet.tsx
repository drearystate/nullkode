import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeApp } from "../spec";
import { themeOf, tr } from "./kit";

/**
 * A bottom sheet of choices: a <select>'s options, where to move a card,
 * how to move a list item. Drawn in the app's colours.
 */

export type Choice = { key: string; label: string; selected?: boolean; disabled?: boolean; group?: string; run?: () => void };

export function ChoiceSheet({
  app,
  visible,
  title,
  choices,
  multiple,
  onPick,
  onClose,
}: {
  app: NativeApp;
  visible: boolean;
  title?: string;
  choices: Choice[];
  /** Several can be chosen; the sheet stays open until Done. */
  multiple?: boolean;
  onPick: (c: Choice) => void;
  onClose: () => void;
}) {
  const th = themeOf(app);
  let insets = { bottom: 0 };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    insets = useSafeAreaInsets();
  } catch {
    /* outside a SafeAreaProvider (fidelity harness) */
  }
  let lastGroup: string | undefined;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={tr(app, "native.close", "Close")} />
      <View style={[styles.sheet, { backgroundColor: th.surface, borderTopLeftRadius: th.radius, borderTopRightRadius: th.radius, paddingBottom: 12 + insets.bottom, direction: app.dir } as never]} accessibilityViewIsModal>
        <View style={[styles.head, { borderColor: th.border }]}>
          <Text style={[styles.title, { color: th.text }]} numberOfLines={2} accessibilityRole="header">
            {title ?? ""}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10} testID="nk-sheet-done">
            <Text style={{ color: th.primary, fontSize: 16, fontWeight: "600" }}>{multiple ? tr(app, "native.done", "Done") : tr(app, "native.cancel", "Cancel")}</Text>
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
          {choices.map((c) => {
            const head = c.group && c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <View key={c.key}>
                {head ? <Text style={[styles.group, { color: th.muted }]}>{head}</Text> : null}
                <Pressable
                  onPress={() => (c.disabled ? undefined : onPick(c))}
                  disabled={c.disabled}
                  accessibilityRole={multiple ? "checkbox" : "button"}
                  accessibilityState={{ selected: c.selected, checked: multiple ? Boolean(c.selected) : undefined, disabled: c.disabled }}
                  testID={`nk-choice-${c.key}`}
                  style={({ pressed }) => [styles.row, { borderColor: th.border, backgroundColor: pressed ? th.border : "transparent", opacity: c.disabled ? 0.45 : 1 }]}
                >
                  <Text style={{ flex: 1, color: c.selected ? th.primary : th.text, fontSize: 17, fontWeight: c.selected ? "600" : "normal" }}>{c.label}</Text>
                  {c.selected ? <Text style={{ color: th.primary, fontSize: 17 }}>{"✓"}</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 4 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, fontSize: 16, fontWeight: "600" },
  group: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, fontSize: 13, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});

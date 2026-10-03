import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { NativeInputNode } from "../spec";
import { useRender } from "../render/context";
import { Store, themeOf, tr } from "./kit";
import { fieldValue as busFieldValue } from "./bus";
import { DateInput } from "./DateInput";
import type { DateKind } from "./dateValue";
import { ChoiceSheet } from "./sheet";
import { FormScope, nextFieldId, useFieldHost, usePageScope, useStore, type FieldEntry, type PickedFile } from "./scope";

/**
 * Form fields with the web's semantics (what a <form> sends, the browser's
 * constraint validation worded like the web runtime's nkValidationText)
 * and the phone's own controls: keyboards per type, a sheet for <select>,
 * the system date/time pickers, the photo library or files for
 * <input type=file>. data-nk-filter fields drive bound lists,
 * data-nk-qs-field ones take a value from the page address.
 */

type Style = Record<string, unknown>;

const KEYBOARD: Record<string, KeyboardTypeOptions> = {
  email: "email-address",
  number: "decimal-pad",
  tel: "phone-pad",
  url: "url",
  search: "web-search",
};
const INPUT_MODE: Record<string, KeyboardTypeOptions> = {
  numeric: "number-pad",
  decimal: "decimal-pad",
  email: "email-address",
  tel: "phone-pad",
  url: "url",
  search: "web-search",
};
const AUTOCOMPLETE = new Set([
  "email",
  "name",
  "given-name",
  "family-name",
  "username",
  "current-password",
  "new-password",
  "password",
  "tel",
  "postal-code",
  "street-address",
  "one-time-code",
  "off",
  "birthdate-full",
  "country",
  "organization",
]);
const TEXT_KEYS = ["color", "fontFamily", "fontSize", "fontStyle", "fontWeight", "lineHeight", "letterSpacing", "textAlign"];
const DATE_TYPES = new Set(["date", "time", "datetime-local"]);

function textPart(style: Style): Style {
  const out: Style = {};
  for (const k of TEXT_KEYS) if (style[k] !== undefined) out[k] = style[k];
  return out;
}

/** Common MIME types for accept=".pdf,.jpg" lists (the document picker wants types). */
const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
};

function acceptTypes(accept?: string): string[] {
  if (!accept) return ["*/*"];
  const out = accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .map((a) => (a.startsWith(".") ? EXT_MIME[a] ?? "*/*" : a));
  return out.length ? [...new Set(out)] : ["*/*"];
}

async function pickFiles(node: NativeInputNode): Promise<PickedFile[] | null> {
  const types = acceptTypes(node.accept);
  const multiple = Boolean(node.multiple);
  if (types.every((t) => t.startsWith("image/"))) {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: multiple, quality: 0.9 });
    if (r.canceled) return null;
    return r.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `photo-${i + 1}.${(a.mimeType ?? "image/jpeg").split("/")[1] ?? "jpg"}`,
      type: a.mimeType ?? "image/jpeg",
      size: a.fileSize,
      ...(a.file ? { file: a.file } : {}),
    }));
  }
  const r = await DocumentPicker.getDocumentAsync({ type: types.length === 1 ? types[0] : types, multiple, copyToCacheDirectory: true });
  if (r.canceled) return null;
  return r.assets.map((a) => ({ uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream", size: a.size, ...(a.file ? { file: a.file } : {}) }));
}

/** Email addresses as browsers accept them (the HTML spec's valid e-mail address). */
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validUrl(v: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) return false;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

function patternOk(pattern: string, v: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`, "u").test(v);
  } catch {
    return true; // a pattern the browser can't read is ignored there too
  }
}

type Say = (key: string, en: string, vars?: Record<string, string | number>) => string;

/** The browser's constraint validation of one value, worded like the web runtime's nkValidationText. */
export function validateValue(node: NativeInputNode, value: string, say: Say): string {
  const t = node.inputType;
  if (node.required && value === "") return t === "select" ? say("fieldChoose", "Please choose an option.") : say("fieldRequired", "Please fill in this field.");
  if (value === "") return "";
  if (t === "email") {
    const all = node.multiple ? value.split(",").map((s) => s.trim()) : [value.trim()];
    if (all.some((s) => !EMAIL.test(s))) return say("fieldEmail", "Please enter an email address.");
  }
  if (t === "url" && !validUrl(value.trim())) return say("fieldUrl", "Please enter a web address.");
  if (t === "number" || t === "range") {
    const n = Number(value.replace(",", "."));
    if (value.trim() === "" || !isFinite(n)) return say("fieldNumber", "Please enter a number.");
    if (node.min !== undefined && node.min !== "" && n < Number(node.min)) return say("fieldMin", "Please enter {min} or more.", { min: node.min });
    if (node.max !== undefined && node.max !== "" && n > Number(node.max)) return say("fieldMax", "Please enter {max} or less.", { max: node.max });
    if (node.step && node.step !== "any" && Number(node.step) > 0) {
      const base = node.min !== undefined && node.min !== "" ? Number(node.min) : 0;
      const k = (n - base) / Number(node.step);
      if (Math.abs(k - Math.round(k)) > 1e-7) return say("fieldPattern", "Please match the requested format.");
    }
  }
  if (DATE_TYPES.has(t)) {
    if (node.min && value < node.min) return say("fieldMin", "Please enter {min} or more.", { min: node.min });
    if (node.max && value > node.max) return say("fieldMax", "Please enter {max} or less.", { max: node.max });
  }
  if (node.minLength && value.length < node.minLength) return say("fieldTooShort", "Please use at least {min} characters.", { min: node.minLength });
  if (node.maxLength && value.length > node.maxLength) return say("fieldTooLong", "Please use no more than {max} characters.", { max: node.maxLength });
  if (node.pattern && !patternOk(node.pattern, value)) return say("fieldPattern", "Please match the requested format.");
  return "";
}

function firstSelected(node: NativeInputNode): string[] {
  const opts = node.options ?? [];
  const sel = opts.filter((o) => o.selected).map((o) => o.value);
  if (sel.length || node.multiple) return node.multiple ? sel : sel.slice(-1);
  // A single <select> shows its first option that can be chosen.
  const first = opts.find((o) => !o.disabled) ?? opts[0];
  return first ? [first.value] : [];
}

/** A form field, drawn natively, registered with its form (or the page). */
export function FieldInput({ node, style }: { node: NativeInputNode; style: Style }) {
  const ctx = useRender();
  const host = useFieldHost();
  const page = usePageScope();
  const app = ctx.app;
  const th = themeOf(app);
  const say: Say = (key, en, vars) => tr(app, key, en, vars);
  const t = node.inputType;
  const nk = node.nk ?? {};
  const id = useMemo(nextFieldId, []);
  const inputRef = useRef<TextInput>(null);

  const initial = useMemo(() => {
    let v = node.value ?? "";
    const qsKey = nk["data-nk-qs-field"];
    if (qsKey && page.query[qsKey] != null) v = page.query[qsKey];
    return { value: v, checked: Boolean(node.checked), selected: t === "select" ? firstSelected(node) : [] };
    // A row's refreshed copy of the field starts again from its own value.
  }, [node, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const [value, setValue] = useState(initial.value);
  const [checked, setChecked] = useState(initial.checked);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [invalid, setInvalid] = useState(false);
  const [sheet, setSheet] = useState(false);

  // Latest values for the form's callbacks.
  const live = useRef({ value, checked, selected, files });
  live.current = { value, checked, selected, files };

  useEffect(() => {
    setValue(initial.value);
    setChecked(initial.checked);
    setSelected(initial.selected);
    setFiles([]);
  }, [initial]);

  // form.reset()
  const form = host instanceof FormScope ? host : null;
  const resets = useStore(form?.resets ?? NO_RESETS);
  const firstReset = useRef(resets);
  useEffect(() => {
    if (resets === firstReset.current) return;
    setValue(initial.value);
    setChecked(initial.checked);
    setSelected(initial.selected);
    setFiles([]);
    setInvalid(false);
  }, [resets, initial]);

  // A radio button with the same name was chosen.
  useEffect(() => {
    if (t !== "radio" || !node.name) return;
    return host.radio.on((e) => {
      if (e.name === node.name && e.id !== id) setChecked(false);
    });
  }, [host, t, node.name, id]);

  // Filled by another behaviour (a QR scanner's data-nk-qr-output).
  useEffect(() => {
    if (!node.name) return;
    const fill = (e: { name: string; value: string }) => {
      if (e.name === node.name) setValue(e.value);
    };
    const a = busFieldValue.on(fill);
    const b = host.fill.on(fill);
    return () => {
      a();
      b();
    };
  }, [host, node.name]);

  // data-nk-filter: this control's value narrows bound lists.
  const filterKey = nk["data-nk-filter"];
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterValue = t === "select" ? selected[0] ?? "" : t === "checkbox" || t === "radio" ? (checked ? node.value || "on" : "") : value;
  const firstFilter = useRef(true);
  useEffect(() => {
    if (!filterKey) return;
    page.setFilter(id, filterKey, filterValue);
    if (firstFilter.current) {
      firstFilter.current = false;
      return;
    }
    if (filterTimer.current) clearTimeout(filterTimer.current);
    const typed = t !== "select" && t !== "checkbox" && t !== "radio" && !DATE_TYPES.has(t);
    filterTimer.current = setTimeout(() => page.applyFilters(nk["data-nk-target"]), typed ? 250 : 0);
  }, [filterKey, filterValue]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      if (filterKey) page.setFilter(id, filterKey, null);
    },
    [filterKey, id, page],
  );

  // Registration with the form: what it sends, whether it is valid.
  useEffect(() => {
    return host.register(id, {
      node,
      entries: (): FieldEntry[] => {
        const name = node.name;
        if (!name || node.disabled) return [];
        const cur = live.current;
        if (t === "checkbox" || t === "radio") return cur.checked ? [{ name, value: node.value || "on" }] : [];
        if (t === "select") return cur.selected.map((v) => ({ name, value: v }));
        if (t === "file") return cur.files.map((f) => ({ name, file: f }));
        return [{ name, value: cur.value }];
      },
      validate: () => {
        // Fields the page hides (and type=hidden ones) send their value but aren't checked: the visitor can't fix them.
        if (node.disabled || node.readOnly || t === "hidden" || node.hidden) return "";
        const cur = live.current;
        if (t === "checkbox") return node.required && !cur.checked ? say("fieldChoose", "Please choose an option.") : "";
        if (t === "radio") {
          if (!node.required || !node.name) return "";
          const any = host.list().some((r) => r.node.inputType === "radio" && r.node.name === node.name && r.entries().length > 0);
          return any ? "" : say("fieldChoose", "Please choose an option.");
        }
        if (t === "select") return node.required && !cur.selected.some((v) => v !== "") ? say("fieldChoose", "Please choose an option.") : "";
        if (t === "file") return node.required && !cur.files.length ? say("fieldRequired", "Please fill in this field.") : "";
        return validateValue(node, cur.value, say);
      },
      showInvalid: (bad, focus) => {
        setInvalid(bad);
        if (bad && focus) inputRef.current?.focus();
      },
      reset: () => {
        setValue(initial.value);
        setChecked(initial.checked);
        setSelected(initial.selected);
        setFiles([]);
      },
    });
  }, [host, id, node, t, initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearInvalid = () => {
    if (invalid) setInvalid(false);
  };

  // Its <label> was tapped (spec: labelFor / fieldId): what a tap on the field does.
  const activate = useRef<() => void>(() => {});
  activate.current = () => {
    if (node.disabled) return;
    if (t === "checkbox") {
      clearInvalid();
      setChecked((c) => !c);
    } else if (t === "radio") {
      clearInvalid();
      setChecked(true);
      if (node.name) host.radio.emit({ name: node.name, id });
    } else if (t === "select") setSheet(true);
    else if (t === "file") {
      void pickFiles(node)
        .then((picked) => {
          if (picked) {
            clearInvalid();
            setFiles(picked);
          }
        })
        .catch(() => {});
    } else inputRef.current?.focus();
  };
  useEffect(() => (node.fieldId ? page.registerField(node.fieldId, () => activate.current()) : undefined), [node.fieldId, page]);
  // Its labels' looks follow its state (Bootstrap's .btn-check:checked + .btn).
  useEffect(() => {
    if (node.fieldId && (t === "checkbox" || t === "radio")) page.setChecked(node.fieldId, checked);
  }, [node.fieldId, page, t, checked]);
  // Invalid: the field's own border in the danger colour (side by side, as the compiler wrote it; a field without a border gets one).
  const hasBorder = ["borderWidth", "borderTopWidth", "borderBottomWidth", "borderStartWidth", "borderEndWidth"].some((k) => Number(style[k] ?? 0) > 0);
  const badBorder = invalid
    ? hasBorder
      ? { borderTopColor: th.danger, borderBottomColor: th.danger, borderStartColor: th.danger, borderEndColor: th.danger, borderLeftColor: th.danger, borderRightColor: th.danger }
      : { borderWidth: 1, borderColor: th.danger }
    : null;
  const label = node.label ?? node.a11y?.label ?? node.placeholder;
  const testID = node.name ? `nk-field-${node.name}` : undefined;

  // The spam trap and hidden fields send without being drawn.
  if (t === "hidden" || node.name === "_nk_hp" || node.name === "_nk_t" || node.hidden) return null;

  if (t === "checkbox" || t === "radio") {
    const color = (style.borderTopColor as string) ?? (style.color as string) ?? "#555";
    return (
      <Pressable
        accessibilityRole={t === "checkbox" ? "checkbox" : "radio"}
        accessibilityState={{ checked, disabled: node.disabled }}
        aria-checked={checked}
        accessibilityLabel={label}
        disabled={node.disabled}
        testID={testID ? `${testID}${t === "radio" ? `-${node.value}` : ""}` : undefined}
        onPress={() => {
          clearInvalid();
          if (t === "radio") {
            setChecked(true);
            if (node.name) host.radio.emit({ name: node.name, id });
          } else setChecked((c) => !c);
        }}
        style={[
          style as never,
          {
            borderWidth: 1,
            borderColor: invalid ? th.danger : checked ? th.primary : color,
            borderRadius: t === "radio" ? 999 : ((style.borderRadius as number) ?? 4),
            backgroundColor: checked ? th.primary : ((style.backgroundColor as string) ?? "transparent"),
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {checked ? <View style={{ width: t === "radio" ? "40%" : "50%", height: t === "radio" ? "40%" : "50%", borderRadius: t === "radio" ? 999 : 1, backgroundColor: "#fff" }} /> : null}
      </Pressable>
    );
  }

  if (t === "select") {
    const opts = node.options ?? [];
    const shown = opts.filter((o) => selected.includes(o.value)).map((o) => o.label);
    return (
      <>
        <Pressable
          style={[style as never, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, badBorder]}
          onPress={() => (node.disabled ? undefined : setSheet(true))}
          accessibilityRole="combobox"
          accessibilityLabel={label}
          accessibilityValue={{ text: shown.join(", ") }}
          testID={testID}
        >
          <Text style={[textPart(style) as never, { flexShrink: 1 }]} numberOfLines={1}>
            {shown.join(", ")}
          </Text>
          <Text style={{ color: (style.color as string) ?? th.text, fontSize: 12 }}>{"▾"}</Text>
        </Pressable>
        <ChoiceSheet
          app={app}
          visible={sheet}
          title={label}
          multiple={node.multiple}
          choices={opts.map((o, i) => ({ key: `${i}`, label: o.label, selected: selected.includes(o.value), disabled: o.disabled, group: o.group }))}
          onClose={() => setSheet(false)}
          onPick={(c) => {
            const o = opts[Number(c.key)];
            if (!o) return;
            clearInvalid();
            if (node.multiple) setSelected((s) => (s.includes(o.value) ? s.filter((v) => v !== o.value) : [...s, o.value]));
            else {
              setSelected([o.value]);
              setSheet(false);
            }
          }}
        />
      </>
    );
  }

  if (DATE_TYPES.has(t)) {
    return (
      <View style={badBorder ? [{ borderRadius: style.borderRadius as number }] : undefined}>
        <DateInput
          app={app}
          kind={t as DateKind}
          value={value}
          onChange={(v) => {
            clearInvalid();
            setValue(v);
          }}
          style={{ ...style, ...(badBorder ?? {}) }}
          textStyle={textPart(style)}
          placeholderColor={node.placeholderColor}
          min={node.min}
          max={node.max}
          disabled={node.disabled || node.readOnly}
          label={label}
          testID={testID}
        />
      </View>
    );
  }

  if (t === "file") {
    const text = files.length === 1 ? files[0].name : files.length > 1 ? tr(app, "native.filesChosen", "{count} files chosen", { count: files.length }) : node.multiple ? tr(app, "native.chooseFiles", "Choose files") : tr(app, "native.chooseFile", "Choose a file");
    return (
      <Pressable
        style={[style as never, { justifyContent: "center" }, badBorder]}
        disabled={node.disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={text}
        testID={testID}
        onPress={() => {
          void pickFiles(node)
            .then((picked) => {
              if (picked) {
                clearInvalid();
                setFiles(picked);
              }
            })
            .catch(() => {});
        }}
      >
        <Text style={[textPart(style) as never, !files.length ? { color: th.primary } : null]} numberOfLines={1}>
          {text}
        </Text>
      </Pressable>
    );
  }

  if (t === "range" || t === "color") {
    return <View style={[style as never, t === "color" && value ? { backgroundColor: value } : null]} accessibilityLabel={label} accessibilityValue={{ text: value }} />;
  }

  const multiline = t === "textarea";
  return (
    <TextInput
      ref={inputRef}
      // A web field never has Android's underline.
      underlineColorAndroid="transparent"
      style={[style as never, multiline ? { textAlignVertical: "top" } : null, badBorder]}
      value={value}
      onChangeText={(v) => {
        clearInvalid();
        setValue(v);
      }}
      placeholder={node.placeholder}
      placeholderTextColor={node.placeholderColor}
      secureTextEntry={t === "password"}
      keyboardType={(node.inputMode && INPUT_MODE[node.inputMode]) || KEYBOARD[t] || "default"}
      autoCapitalize={t === "email" || t === "url" || t === "password" || t === "search" || node.autoComplete === "username" ? "none" : "sentences"}
      autoCorrect={t === "email" || t === "url" || t === "password" ? false : undefined}
      autoComplete={(node.autoComplete && AUTOCOMPLETE.has(node.autoComplete) ? node.autoComplete : t === "email" ? "email" : t === "tel" ? "tel" : undefined) as never}
      multiline={multiline}
      numberOfLines={multiline ? node.rows : undefined}
      editable={!node.readOnly && !node.disabled}
      maxLength={node.maxLength}
      accessibilityLabel={label}
      accessibilityState={{ disabled: node.disabled }}
      returnKeyType={multiline ? "default" : form ? "go" : "done"}
      submitBehavior={multiline ? "newline" : "blurAndSubmit"}
      onSubmitEditing={multiline || !form ? undefined : () => form.submit()}
      testID={testID}
      {...(Platform.OS === "web" ? ({ "aria-invalid": invalid || undefined } as object) : {})}
    />
  );
}

const NO_RESETS = new Store<number>(0);

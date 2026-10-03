import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { SvgXml } from "react-native-svg";
import type { NativeBackgroundImage, NativeNode, NativeTextRun } from "../spec";
import { resolveUrl } from "../api";
import { applyBehaviours, followHref, renderingBehaviour, type RenderExtras } from "./behaviours";
import { FieldInput } from "../behaviours/fields";
import { useRender, type RenderContext } from "./context";
import { Island } from "./Island";
import { toStyle } from "./style";
import { runWithVariants, useNodeVariants, withVariants } from "./variants";
import { usePageScope, type PageScope } from "../behaviours/scope";

type Style = Record<string, unknown>;

/** What a press on a node does: its own link, or a behaviour's; a <label> focuses (or ticks) its field. */
function pressFor(node: { href?: string; to?: NativeNode["to"]; external?: boolean; labelFor?: string }, ctx: RenderContext, fromBehaviour?: () => void, page?: PageScope): (() => void) | undefined {
  if (fromBehaviour) return fromBehaviour;
  if (node.labelFor && !node.href && !node.to && page) {
    const id = node.labelFor;
    return () => page.activateField(id);
  }
  if (node.to && !node.external) {
    const to = node.to;
    // In-page anchor: scroll to it (behaviours/anchors.tsx).
    if (to.page === ctx.page.slug && to.hash && !to.query) return ctx.anchors ? () => ctx.anchors!.scrollTo(to.hash!) : undefined;
    return () => ctx.navigate(to);
  }
  if (node.href) {
    const href = node.href;
    if (href.startsWith("#")) return ctx.anchors && href.length > 1 ? () => ctx.anchors!.scrollTo(href) : undefined;
    return () => (node.external ? ctx.openUrl(resolveUrl(href, ctx.app)) : followHref(resolveUrl(href, ctx.app), ctx));
  }
  return undefined;
}

function fitOf(size?: string): "cover" | "contain" | "fill" | "none" {
  if (size === "contain") return "contain";
  if (size === "cover" || !size) return "cover";
  if (/100% 100%/.test(size)) return "fill";
  return "cover";
}

function Background({ bg }: { bg: NativeBackgroundImage }) {
  const ctx = useRender();
  return (
    <Image
      source={{ uri: resolveUrl(bg.src, ctx.app) }}
      style={StyleSheet.absoluteFill}
      contentFit={fitOf(bg.size)}
      contentPosition={bg.position as never}
      pointerEvents="none"
    />
  );
}

/* ── Text ─────────────────────────────────────────────────────────────── */

function Runs({ runs }: { runs: NativeTextRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Run key={i} run={r} />
      ))}
    </>
  );
}

/** One run; `skip`: behaviours that already drew it (see Behaviour.renderRun). */
function Run({ run: given, skip, press: pressOverride }: { run: NativeTextRun; skip?: readonly string[]; press?: () => void }) {
  const ctx = useRender();
  const page = usePageScope();
  const r = runWithVariants(given, useNodeVariants(given));
  if (r.node && !r.hidden) return <RenderNode node={r.node} />;
  const own = renderingBehaviour(r, "renderRun", skip);
  // Hidden runs stay hidden unless a behaviour may show them (signed-in text).
  if (r.hidden && !own?.b.reveals) return null;
  if (own) return <>{own.b.renderRun!(own.value, r, ctx, (run, p) => <Run run={run} press={p ?? pressOverride} skip={[...(skip ?? []), own.b.attr]} />)}</>;
  const b = applyBehaviours(r, ctx, skip);
  if (b.hidden) return null;
  const press = pressOverride ?? pressFor(r, ctx, b.onPress, page);
  if (!r.style && !r.runs && !press) return <>{r.text}</>;
  return (
    <Text style={toStyle(r.style, undefined, ctx) as never} onPress={press} accessibilityRole={press ? "link" : undefined}>
      {r.text}
      {r.runs ? <Runs runs={r.runs} /> : null}
    </Text>
  );
}

/* ── Form fields: behaviours/fields.tsx (FieldInput) ─────────────────── */

/* ── Nodes ────────────────────────────────────────────────────────────── */

function a11yProps(node: NativeNode) {
  const a = node.a11y;
  if (!a) return {};
  return {
    accessibilityRole: (a.role === "none" ? undefined : a.role) as never,
    accessibilityLabel: a.label,
    accessibilityElementsHidden: a.hidden,
    importantForAccessibility: a.hidden ? ("no-hide-descendants" as const) : undefined,
  };
}

/** Style keys that place a box in its parent (kept on a wrapper around pressable text). */
const BOX_KEYS = /^(margin|flex|alignSelf|width|minWidth|maxWidth|position|top|bottom|left|right|start|end|zIndex|aspectRatio)/;

/** Screen-reader actions and hint a behaviour asked for (RenderExtras). */
function extrasA11y(extras?: RenderExtras) {
  if (!extras?.actions?.length && !extras?.hint) return {};
  const acts = extras.actions ?? [];
  return {
    accessibilityHint: extras.hint,
    accessibilityActions: acts.length ? acts.map((a) => ({ name: a.name, label: a.label })) : undefined,
    onAccessibilityAction: acts.length ? (e: { nativeEvent: { actionName: string } }) => acts.find((a) => a.name === e.nativeEvent.actionName)?.run() : undefined,
  };
}

function children(list: NativeNode[]): ReactNode {
  return list.map((c, i) => <RenderNode key={i} node={c} />);
}

/**
 * One node of the page. `press` makes it pressable (a behaviour drawing it);
 * `skip` lists behaviours that already drew it (see Behaviour.render).
 */
export function RenderNode({ node: given, press: pressOverride, skip, extras }: { node: NativeNode; press?: () => void; skip?: readonly string[]; extras?: RenderExtras }) {
  const ctx = useRender();
  const page = usePageScope();
  // Its look in the states in force (dark theme, a playing radio).
  const node = withVariants(given, useNodeVariants(given));
  const own = renderingBehaviour(node, "render", skip);
  // Hidden nodes stay hidden unless a behaviour may show them (signed-in
  // content, a form's message); hidden form fields still send their value.
  if (node.hidden && !own?.b.reveals && node.type !== "input") return null;
  if (own) {
    const next = [...(skip ?? []), own.b.attr];
    // What an outer behaviour asked for (a press, a long press) still applies unless this one asks otherwise.
    return <>{own.b.render!(own.value, node, ctx, (n, p, x) => <RenderNode node={n} press={p ?? pressOverride} skip={next} extras={x ? { ...extras, ...x } : extras} />)}</>;
  }
  const b = applyBehaviours(node, ctx, skip);
  if (b.hidden) return null;
  const style = toStyle(node.style, node.vh, ctx);
  const press = pressOverride ?? pressFor(node, ctx, b.onPress, page);
  const longPress = extras?.onLongPress;
  const actionProps = extrasA11y(extras);
  // A target of an in-page link: the anchors behaviour finds it on the screen.
  const anchorRef = node.id && ctx.anchors?.isTarget(node.id) ? ctx.anchors.refFor(node.id) : undefined;

  switch (node.type) {
    case "text": {
      if (longPress) {
        // Touch and hold on a line of text (a sortable item): a pressable box
        // takes the line's place in the layout (the browser build's Text has
        // no long press).
        const outer: Style = {};
        const innerStyle: Style = {};
        for (const [k, v] of Object.entries(style)) (BOX_KEYS.test(k) ? outer : innerStyle)[k] = v;
        return (
          <Pressable ref={anchorRef as never} style={outer as never} onPress={press} onLongPress={longPress} {...a11yProps(node)} {...actionProps}>
            <Text style={innerStyle as never} numberOfLines={node.lines}>
              <Runs runs={node.runs} />
            </Text>
          </Pressable>
        );
      }
      return (
        <Text ref={anchorRef as never} style={style as never} numberOfLines={node.lines} onPress={press} {...a11yProps(node)} {...actionProps}>
          <Runs runs={node.runs} />
        </Text>
      );
    }
    case "image":
      return (
        <Image
          source={{ uri: resolveUrl(node.src, ctx.app) }}
          style={style as never}
          contentFit={(node.fit as never) ?? "cover"}
          contentPosition={node.position as never}
          accessibilityLabel={node.alt}
          transition={0}
        />
      );
    case "svg":
      return (
        <View style={style as never} {...a11yProps(node)}>
          <SvgXml xml={node.xml} width={(style.width as number) ?? "100%"} height={(style.height as number) ?? "100%"} />
        </View>
      );
    case "input":
      // The field keeps its spec node (its state starts again only when that changes); a state's look comes in the style.
      return <FieldInput node={given.type === "input" && given.hidden === node.hidden ? given : node} style={style} />;
    case "web":
      return <Island node={node} style={style} />;
    case "button":
      return (
        <Pressable style={style as never} onPress={press} onLongPress={longPress} disabled={node.disabled} accessibilityRole="button" accessibilityState={node.disabled ? { disabled: true } : undefined} {...a11yProps(node)} {...actionProps}>
          {node.bgImage ? <Background bg={node.bgImage} /> : null}
          {children(node.children)}
          {extras?.extra}
        </Pressable>
      );
    case "view": {
      const inner = (
        <>
          {node.bgImage ? <Background bg={node.bgImage} /> : null}
          {children(node.children)}
          {extras?.extra}
        </>
      );
      if (node.scrollX) {
        const { flexDirection, flexWrap, justifyContent, alignItems, columnGap, rowGap, ...outer } = style;
        return (
          <ScrollView horizontal style={outer as never} contentContainerStyle={{ flexDirection, flexWrap, justifyContent, alignItems, columnGap, rowGap } as never} showsHorizontalScrollIndicator={false}>
            {inner}
          </ScrollView>
        );
      }
      if (press || longPress) {
        return (
          <Pressable ref={anchorRef as never} style={style as never} onPress={press} onLongPress={longPress} {...a11yProps(node)} accessibilityRole={node.to || node.href ? "link" : press ? "button" : undefined} {...actionProps}>
            {inner}
          </Pressable>
        );
      }
      return (
        <View ref={anchorRef as never} collapsable={anchorRef ? false : undefined} style={style as never} {...a11yProps(node)}>
          {inner}
        </View>
      );
    }
    default:
      return null;
  }
}

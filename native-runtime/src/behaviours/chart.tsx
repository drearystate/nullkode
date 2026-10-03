import { useCallback, useEffect, useRef, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from "react-native-svg";
import type { NativeNode } from "../spec";
import type { Behaviour } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { toStyle } from "../render/style";
import { dataChanged, filtersChanged } from "./bus";
import { flowOf, intlLocale, matches, rowsOf, runFlow, themeOf, tr } from "./kit";

/**
 * data-nk-chart on a <canvas>: the native twin of the web runtime's chart
 * (RUNTIME_JS "11. Chart rendering"), drawn with react-native-svg from the
 * same flow and the same geometry: data-nk-chart="bar" | "line" | "pie" |
 * "doughnut" (also "donut"), data-nk-bind-flow, data-nk-label-field (default
 * "name"), data-nk-value-field (default "value"). Filters (data-nk-filter …
 * data-nk-target) send their values to the flow; charts load again after a
 * form is sent.
 */

type Data = { labels: string[]; values: number[] };

function Chart({ node, ctx }: { node: NativeNode; ctx: RenderContext }) {
  const nk = node.nk ?? {};
  const type = (nk["data-nk-chart"] || "bar").toLowerCase();
  const flowId = flowOf(nk);
  const labelField = nk["data-nk-label-field"] || "name";
  const valueField = nk["data-nk-value-field"] || "value";
  const [data, setData] = useState<Data | null>(null);
  const [width, setWidth] = useState(0);
  const filters = useRef<Record<string, string>>({});
  const th = themeOf(ctx.app);

  const load = useCallback(async () => {
    if (!flowId) return setData({ labels: [], values: [] });
    try {
      const r = await runFlow(ctx, flowId, filters.current);
      const rows = rowsOf(r.body);
      setData({ labels: rows.map((x) => String(x[labelField] ?? "")), values: rows.map((x) => parseFloat(String(x[valueField] ?? "")) || 0) });
    } catch {
      setData({ labels: [], values: [] });
    }
  }, [ctx, flowId, labelField, valueField]);

  useEffect(() => {
    void load();
    const off1 = dataChanged.on(() => void load());
    const off2 = filtersChanged.on(({ target, values }) => {
      if (target && !matches({ ...node, tag: "canvas" }, target)) return;
      filters.current = values;
      void load();
    });
    return () => {
      off1();
      off2();
    };
  }, [load, node]);

  const style = toStyle(node.style, node.vh, ctx);
  const h = typeof style.height === "number" ? style.height : typeof style.minHeight === "number" ? style.minHeight : 220;
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const colors = [th.primary, th.accent, "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#14b8a6"];
  const label = `${tr(ctx.app, "native.chart", "Chart")}: ${data?.labels.map((l, i) => `${l} ${data.values[i]}`).join(", ") ?? ""}`;

  return (
    <View testID="nk-chart" style={[style as never, { height: h }]} onLayout={onLayout} accessibilityRole="image" accessibilityLabel={label}>
      {width > 0 && data ? (
        <Svg width={width} height={h}>
          {draw(type, data, width, h, colors, th, intlLocale(ctx.app), tr(ctx.app, "noData", "No data"))}
        </Svg>
      ) : null}
    </View>
  );
}

function draw(type: string, { labels, values }: Data, w: number, h: number, colors: string[], th: ReturnType<typeof themeOf>, loc: string | undefined, noData: string) {
  if (!values.length) {
    return (
      <SvgText x={w / 2} y={h / 2} fill={th.muted} fontSize={13} textAnchor="middle">
        {noData}
      </SvgText>
    );
  }
  if (type === "pie" || type === "doughnut" || type === "donut") {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const cx = w * 0.4;
    const cy = h / 2;
    const r = Math.max(4, Math.min(cx, cy) - 10);
    let a = -Math.PI / 2;
    const slices = values.map((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      const a0 = a;
      a += slice;
      const color = colors[i % colors.length];
      if (slice >= Math.PI * 2 - 1e-6) return <Circle key={i} cx={cx} cy={cy} r={r} fill={color} />;
      if (slice <= 0) return null;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a);
      const y1 = cy + r * Math.sin(a);
      return <Path key={i} d={`M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${slice > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`} fill={color} />;
    });
    const lx = w * 0.72;
    return (
      <G>
        {slices}
        {type !== "pie" ? <Circle cx={cx} cy={cy} r={r * 0.55} fill={th.bg} /> : null}
        {labels.slice(0, 8).map((l, i) => (
          <G key={`l${i}`}>
            <Rect x={lx} y={16 + i * 22} width={10} height={10} fill={colors[i % colors.length]} />
            <SvgText x={lx + 16} y={25 + i * 22} fill={th.text} fontSize={11}>
              {`${l.slice(0, 15)} (${values[i]})`}
            </SvgText>
          </G>
        ))}
      </G>
    );
  }
  // Bar and line.
  const max = Math.max(...values) || 1;
  const barW = (w - 40) / values.length;
  const chartH = h - 30;
  const yOf = (v: number) => chartH - (v / max) * (chartH - 10);
  const grid = [0, 1, 2, 3].map((g) => {
    const gy = chartH - (chartH - 10) * (g / 3);
    return <Line key={`g${g}`} x1={20} y1={gy} x2={w - 10} y2={gy} stroke={th.border} strokeWidth={0.5} />;
  });
  const marks = values.map((v, i) => {
    const cxi = 20 + i * barW + barW / 2;
    const parts = [
      <SvgText key={`t${i}`} x={cxi} y={h - 5} fill={th.muted} fontSize={10} textAnchor="middle">
        {labels[i].slice(0, 12)}
      </SvgText>,
    ];
    if (type !== "line") {
      const barH = (v / max) * (chartH - 10);
      const rx = 20 + i * barW + 4;
      const ry = chartH - barH;
      const rw = Math.max(0, barW - 8);
      const cr = Math.min(4, rw / 2, barH);
      parts.push(
        <Path key={`b${i}`} d={`M${rx + cr},${ry} L${rx + rw - cr},${ry} Q${rx + rw},${ry} ${rx + rw},${ry + cr} L${rx + rw},${ry + barH} L${rx},${ry + barH} L${rx},${ry + cr} Q${rx},${ry} ${rx + cr},${ry} Z`} fill={colors[i % colors.length]} />,
        <SvgText key={`v${i}`} x={cxi} y={chartH - barH - 4} fill={th.text} fontSize={9} textAnchor="middle">
          {v.toLocaleString(loc)}
        </SvgText>,
      );
    }
    return <G key={i}>{parts}</G>;
  });
  let line = null;
  if (type === "line" && values.length > 1) {
    const pts = values.map((v, i) => `${20 + i * barW + barW / 2},${yOf(v)}`);
    const area = `M${pts.join(" L")} L${20 + (values.length - 1) * barW + barW / 2},${chartH} L${20 + barW / 2},${chartH} Z`;
    line = (
      <G>
        <Path d={area} fill={colors[0]} fillOpacity={0.1} />
        <Polyline points={pts.join(" ")} fill="none" stroke={colors[0]} strokeWidth={2.5} strokeLinejoin="round" />
        {values.map((v, i) => (
          <Circle key={`d${i}`} cx={20 + i * barW + barW / 2} cy={yOf(v)} r={4} fill={colors[0]} stroke={th.bg} strokeWidth={2} />
        ))}
      </G>
    );
  }
  return (
    <G>
      {grid}
      {marks}
      {line}
    </G>
  );
}

export const CHART_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-chart",
    phase: 2,
    // Before bound lists: a chart also carries data-nk-bind-flow.
    priority: 20,
    render: (_v, node, ctx) => <Chart node={node} ctx={ctx} />,
  },
];

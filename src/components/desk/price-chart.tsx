import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/engine";
import { emaSeries } from "@/lib/engine";

type Props = {
  candles: Candle[];
  className?: string;
};

export function PriceChart({ candles, className }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || candles.length < 2) return;
    let disposed = false;
    let chart: { remove: () => void; resize: (w: number, h: number) => void } | undefined;
    let ro: ResizeObserver | undefined;

    (async () => {
      const {
        createChart,
        CandlestickSeries,
        LineSeries,
        HistogramSeries,
        ColorType,
      } = await import("lightweight-charts");
      if (disposed || !host.current) return;
      const node = host.current;
      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue("--color-bg").trim() || "#090b0e";
      const fg = styles.getPropertyValue("--color-muted").trim() || "#8a9088";
      const long = styles.getPropertyValue("--color-long").trim() || "#5ea87a";
      const short = styles.getPropertyValue("--color-short").trim() || "#c56b66";
      const accent = styles.getPropertyValue("--color-accent").trim() || "#d5d8d0";
      const faint = styles.getPropertyValue("--color-faint").trim() || "#5c625c";

      const instance = createChart(node, {
        width: node.clientWidth || 600,
        height: node.clientHeight || 360,
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: bg },
          textColor: fg,
          fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(236,236,234,0.04)" },
          horzLines: { color: "rgba(236,236,234,0.04)" },
        },
        rightPriceScale: { borderColor: "rgba(236,236,234,0.08)" },
        timeScale: {
          borderColor: "rgba(236,236,234,0.08)",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 4,
          barSpacing: 7,
          fixLeftEdge: false,
        },
        crosshair: {
          vertLine: { color: faint, width: 1, style: 3 },
          horzLine: { color: faint, width: 1, style: 3 },
        },
      });
      chart = instance;

      const candlesSeries = instance.addSeries(CandlestickSeries, {
        upColor: long,
        downColor: short,
        borderVisible: false,
        wickUpColor: long,
        wickDownColor: short,
      });
      candlesSeries.setData(
        candles.map((c) => ({
          time: c.t as never,
          open: c.o,
          high: c.h,
          low: c.l,
          close: c.c,
        })),
      );

      const ema9 = instance.addSeries(LineSeries, {
        color: accent,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema9.setData(emaSeries(candles, 9).map((p) => ({ time: p.t as never, value: p.value })));

      const ema21 = instance.addSeries(LineSeries, {
        color: faint,
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema21.setData(emaSeries(candles, 21).map((p) => ({ time: p.t as never, value: p.value })));

      const volume = instance.addSeries(HistogramSeries, {
        priceScaleId: "volume",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      instance.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });
      volume.setData(
        candles.map((c) => ({
          time: c.t as never,
          value: c.v,
          color: c.c >= c.o ? "rgba(94,168,122,0.35)" : "rgba(197,107,102,0.35)",
        })),
      );

      instance.timeScale().fitContent();
      ro = new ResizeObserver(() => {
        if (!host.current) return;
        instance.resize(host.current.clientWidth, host.current.clientHeight);
      });
      ro.observe(node);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      chart?.remove();
    };
  }, [candles]);

  return <div ref={host} className={className} role="img" aria-label="Price chart" />;
}

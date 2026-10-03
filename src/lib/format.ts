import type { Pair } from "@/lib/markets";

export function formatPrice(value: number, pair: Pair): string {
  if (!Number.isFinite(value)) return "—";
  const digits = pair.decimals;
  if (pair.kind === "crypto" && value >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMoney(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) {
    return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatPct(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatQty(value: number, pair: Pair): string {
  if (!Number.isFinite(value)) return "—";
  if (pair.kind === "forex") {
    if (value >= 100_000) return `${(value / 100_000).toFixed(2)} lots`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(2)} mini`;
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} units`;
  }
  const d = value >= 1 ? 4 : 6;
  return `${value.toFixed(d)} ${pair.base}`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

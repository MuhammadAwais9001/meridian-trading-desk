import { createServerFn } from "@tanstack/react-start";
import {
  FOREX_PAIRS,
  PAIRS,
  getPair,
  intervalMinutes,
  type Interval,
  type Pair,
} from "@/lib/markets";
import type { Candle } from "@/lib/engine";

export type Ticker = {
  id: string;
  price: number;
  changePct: number;
  volume: number;
  source: string;
};

export type DeskPayload = {
  pairId: string;
  interval: Interval;
  candles: Candle[];
  tickers: Ticker[];
  quote: Ticker | null;
  source: string;
  asOf: number;
};

type CacheEntry<T> = { at: number; value: T };

const mem = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = mem.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
  return fn().then((value) => {
    mem.set(key, { at: Date.now(), value });
    return value;
  });
}

async function fetchJson<T>(url: string, ms = 7000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

function sortCandles(rows: Candle[]): Candle[] {
  const byT = new Map<number, Candle>();
  for (const r of rows) {
    if (!Number.isFinite(r.t) || !Number.isFinite(r.c)) continue;
    byT.set(r.t, r);
  }
  return [...byT.values()].sort((a, b) => a.t - b.t);
}

function aggregate(rows: Candle[], n: number): Candle[] {
  if (n <= 1) return rows;
  const out: Candle[] = [];
  for (let i = 0; i < rows.length; i += n) {
    const chunk = rows.slice(i, i + n);
    if (!chunk.length) continue;
    out.push({
      t: chunk[0].t,
      o: chunk[0].o,
      h: Math.max(...chunk.map((c) => c.h)),
      l: Math.min(...chunk.map((c) => c.l)),
      c: chunk[chunk.length - 1].c,
      v: chunk.reduce((s, c) => s + c.v, 0),
    });
  }
  return out;
}

async function coinbaseCandles(product: string, interval: Interval): Promise<Candle[]> {
  const gran: Record<Exclude<Interval, "4h">, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "1d": 86400,
  };
  const g = interval === "4h" ? 3600 : gran[interval];
  const data = await fetchJson<number[][]>(
    `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${g}`,
  );
  const rows = data.map((d) => ({
    t: d[0],
    l: d[1],
    h: d[2],
    o: d[3],
    c: d[4],
    v: d[5],
  }));
  const sorted = sortCandles(rows);
  return interval === "4h" ? aggregate(sorted, 4) : sorted;
}

async function okxCandles(instId: string, interval: Interval): Promise<Candle[]> {
  const bar: Record<Interval, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1h": "1H",
    "4h": "4H",
    "1d": "1D",
  };
  const json = await fetchJson<{ data?: string[][] }>(
    `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar[interval]}&limit=300`,
  );
  const rows = (json.data ?? []).map((d) => ({
    t: Math.floor(Number(d[0]) / 1000),
    o: Number(d[1]),
    h: Number(d[2]),
    l: Number(d[3]),
    c: Number(d[4]),
    v: Number(d[5]),
  }));
  return sortCandles(rows);
}

async function krakenCandles(pair: string, interval: Interval): Promise<Candle[]> {
  const map: Record<Interval, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 60,
    "4h": 240,
    "1d": 1440,
  };
  const json = await fetchJson<{ result?: Record<string, unknown> }>(
    `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${map[interval]}`,
  );
  const result = json.result ?? {};
  const key = Object.keys(result).find((k) => k !== "last");
  const rows = (key ? (result[key] as unknown[]) : []) as [
    number,
    string,
    string,
    string,
    string,
    string,
    string,
    number,
  ][];
  return sortCandles(
    rows.map((d) => ({
      t: d[0],
      o: Number(d[1]),
      h: Number(d[2]),
      l: Number(d[3]),
      c: Number(d[4]),
      v: Number(d[6]),
    })),
  );
}

async function cryptoCandles(pair: Pair, interval: Interval): Promise<{ candles: Candle[]; source: string }> {
  const errors: string[] = [];
  if (pair.coinbase) {
    try {
      const candles = await coinbaseCandles(pair.coinbase, interval);
      if (candles.length > 40) return { candles, source: "Coinbase" };
    } catch (e) {
      errors.push(String(e));
    }
  }
  if (pair.okx) {
    try {
      const candles = await okxCandles(pair.okx, interval);
      if (candles.length > 40) return { candles, source: "OKX" };
    } catch (e) {
      errors.push(String(e));
    }
  }
  if (pair.kraken) {
    try {
      const candles = await krakenCandles(pair.kraken, interval);
      if (candles.length > 40) return { candles, source: "Kraken" };
    } catch (e) {
      errors.push(String(e));
    }
  }
  throw new Error(errors[0] ?? "No crypto candle source");
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailyFromCloses(points: { t: number; c: number }[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].c;
    const close = points[i].c;
    const change = close - prev;
    const range = Math.max(Math.abs(change) * 1.85, close * 0.0018);
    const high = Math.max(prev, close) + range * 0.32;
    const low = Math.min(prev, close) - range * 0.32;
    out.push({
      t: points[i].t,
      o: prev,
      h: high,
      l: low,
      c: close,
      v: Math.abs(change) * 1e6,
    });
  }
  return out;
}

function expandDay(day: Candle, minutes: number, rng: () => number): Candle[] {
  const bars = Math.max(8, Math.round((24 * 60) / minutes));
  const path: number[] = [];
  for (let i = 0; i < bars; i++) {
    const t = bars === 1 ? 1 : i / (bars - 1);
    const base = day.o + (day.c - day.o) * t;
    const envelope = Math.sin(Math.PI * t);
    const noise = (rng() * 2 - 1) * (day.h - day.l) * 0.28 * envelope;
    path.push(Math.min(day.h, Math.max(day.l, base + noise)));
  }
  path[0] = day.o;
  path[path.length - 1] = day.c;
  const out: Candle[] = [];
  const step = minutes * 60;
  for (let i = 0; i < path.length; i++) {
    const px = path[i];
    const prev = i === 0 ? day.o : path[i - 1];
    const jitter = (day.h - day.l) * 0.08;
    out.push({
      t: day.t + i * step,
      o: prev,
      h: Math.min(day.h, Math.max(px, prev) + jitter * rng()),
      l: Math.max(day.l, Math.min(px, prev) - jitter * rng()),
      c: px,
      v: day.v / bars,
    });
  }
  return out;
}

async function frankfurterHistory(from: string, to: string): Promise<{ t: number; c: number }[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 220 * 86400000);
  const a = start.toISOString().slice(0, 10);
  const b = end.toISOString().slice(0, 10);
  const json = await fetchJson<{ rates?: Record<string, Record<string, number>> }>(
    `https://api.frankfurter.app/${a}..${b}?from=${from}&to=${to}`,
    10000,
  );
  const rates = json.rates ?? {};
  return Object.keys(rates)
    .sort()
    .map((d) => ({
      t: Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 1000),
      c: rates[d][to],
    }))
    .filter((p) => Number.isFinite(p.c));
}

async function liveFx(from: string, to: string): Promise<number | null> {
  try {
    const json = await fetchJson<{ data?: { rates?: Record<string, string> } }>(
      `https://api.coinbase.com/v2/exchange-rates?currency=${from}`,
    );
    const n = Number(json.data?.rates?.[to]);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* fall through */
  }
  try {
    const json = await fetchJson<{ rates?: Record<string, number> }>(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
    );
    const n = json.rates?.[to];
    if (n && Number.isFinite(n)) return n;
  } catch {
    /* fall through */
  }
  try {
    const json = await fetchJson<{ rates?: Record<string, number> }>(
      `https://open.er-api.com/v6/latest/${from}`,
    );
    const n = json.rates?.[to];
    if (n && Number.isFinite(n)) return n;
  } catch {
    /* fall through */
  }
  return null;
}

async function forexCandles(pair: Pair, interval: Interval): Promise<{ candles: Candle[]; source: string }> {
  const from = pair.fxFrom ?? "EUR";
  const to = pair.fxTo ?? "USD";
  const hist = await frankfurterHistory(from, to);
  const live = await liveFx(from, to);
  if (hist.length < 30) throw new Error("FX history unavailable");
  if (live) hist[hist.length - 1] = { t: Math.floor(Date.now() / 1000), c: live };
  const daily = dailyFromCloses(hist);
  if (interval === "1d") {
    return { candles: daily.slice(-180), source: "ECB / Frankfurter + live quote" };
  }
  const minutes = intervalMinutes(interval);
  const expanded: Candle[] = [];
  const recent = daily.slice(-36);
  for (const day of recent) {
    const rng = mulberry32(day.t ^ Math.round(day.c * 1e6) ^ minutes);
    expanded.push(...expandDay(day, minutes, rng));
  }
  if (live && expanded.length) {
    const last = expanded[expanded.length - 1];
    last.c = live;
    last.h = Math.max(last.h, live);
    last.l = Math.min(last.l, live);
  }
  return {
    candles: expanded.slice(-240),
    source: "Official daily range + live quote reconstruction",
  };
}

async function fetchCandles(pair: Pair, interval: Interval) {
  if (pair.kind === "crypto") return cryptoCandles(pair, interval);
  return forexCandles(pair, interval);
}

async function cryptoTicker(pair: Pair): Promise<Ticker> {
  if (pair.coinbase) {
    const [ticker, stats] = await Promise.all([
      fetchJson<{ price?: string; volume?: string }>(
        `https://api.exchange.coinbase.com/products/${pair.coinbase}/ticker`,
      ),
      fetchJson<{ open?: string; last?: string; volume?: string }>(
        `https://api.exchange.coinbase.com/products/${pair.coinbase}/stats`,
      ),
    ]);
    const price = Number(ticker.price ?? stats.last);
    const open = Number(stats.open);
    const changePct = open ? ((price - open) / open) * 100 : 0;
    return {
      id: pair.id,
      price,
      changePct,
      volume: Number(stats.volume ?? ticker.volume ?? 0),
      source: "Coinbase",
    };
  }
  throw new Error("no ticker");
}

async function allTickers(): Promise<Ticker[]> {
  return cached("tickers", 6000, async () => {
    const crypto = await Promise.all(
      PAIRS.filter((p) => p.kind === "crypto").map(async (p) => {
        try {
          return await cryptoTicker(p);
        } catch {
          return null;
        }
      }),
    );
    const fxLive: Ticker[] = [];
    const bases = [...new Set(FOREX_PAIRS.map((p) => p.fxFrom ?? "USD"))];
    const rateMap = new Map<string, Record<string, number>>();
    await Promise.all(
      bases.map(async (base) => {
        try {
          const json = await fetchJson<{ data?: { rates?: Record<string, string> } }>(
            `https://api.coinbase.com/v2/exchange-rates?currency=${base}`,
          );
          const rec: Record<string, number> = {};
          for (const [k, v] of Object.entries(json.data?.rates ?? {})) {
            rec[k] = Number(v);
          }
          rateMap.set(base, rec);
        } catch {
          /* ignore */
        }
      }),
    );
    for (const p of FOREX_PAIRS) {
      const rec = rateMap.get(p.fxFrom ?? "");
      const price = rec?.[p.fxTo ?? ""];
      if (!price) continue;
      fxLive.push({
        id: p.id,
        price,
        changePct: 0,
        volume: 0,
        source: "Coinbase FX",
      });
    }
    return [...crypto.filter((t): t is Ticker => t !== null), ...fxLive];
  });
}

export const loadDesk = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const d = input as { pairId?: string; interval?: string };
    if (!d?.pairId || !d?.interval) throw new Error("pairId and interval required");
    return { pairId: String(d.pairId), interval: d.interval as Interval };
  })
  .handler(async ({ data }): Promise<DeskPayload> => {
    const pair = getPair(data.pairId);
    const [book, tickers] = await Promise.all([
      cached(`candles:${pair.id}:${data.interval}`, 8000, () => fetchCandles(pair, data.interval)),
      allTickers(),
    ]);
    const quote = tickers.find((t) => t.id === pair.id) ?? null;
    let candles = book.candles;
    if (quote && candles.length) {
      const last = { ...candles[candles.length - 1] };
      last.c = quote.price;
      last.h = Math.max(last.h, quote.price);
      last.l = Math.min(last.l, quote.price);
      candles = [...candles.slice(0, -1), last];
    }
    return {
      pairId: pair.id,
      interval: data.interval,
      candles,
      tickers,
      quote,
      source: book.source,
      asOf: Date.now(),
    };
  });

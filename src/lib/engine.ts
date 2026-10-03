import type { Interval, Pair } from "@/lib/markets";
import { intervalMinutes } from "@/lib/markets";

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Bias = "LONG" | "SHORT" | "WAIT";
export type Grade = "High" | "Medium" | "Low";

export type Factor = {
  id: string;
  label: string;
  vote: Bias;
  score: number;
  note: string;
};

export type SignalReport = {
  bias: Bias;
  confidence: number;
  grade: Grade;
  aligned: number;
  factors: Factor[];
  entry: number;
  stop: number;
  takeProfit1: number;
  takeProfit2: number;
  atr: number;
  rsi: number;
  adx: number;
  ema9: number;
  ema21: number;
  ema50: number;
  macdHist: number;
  support: number;
  resistance: number;
  riskPct: number;
  rewardPct1: number;
  rr1: number;
  rr2: number;
  thesis: string;
  invalidation: string;
};

export type BacktestSummary = {
  trades: number;
  wins: number;
  losses: number;
  scratches: number;
  winRate: number;
  avgR: number;
  expectancy: number;
};

export type TradePlan = {
  pair: Pair;
  interval: Interval;
  signal: SignalReport;
  backtest: BacktestSummary;
  tradeValue: number;
  riskPctInput: number;
  units: number;
  notional: number;
  dollarRisk: number;
  dollarReward1: number;
  dollarReward2: number;
  riskOfValue: number;
  fees: number;
  netReward1: number;
  recommendation: "TAKE" | "REDUCE" | "PASS";
  recNote: string;
  holdHint: string;
};

function last<T>(arr: T[], n = 1): T | undefined {
  return arr[arr.length - n];
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  const k = 2 / (period + 1);
  let prev = 0;
  let seeded = false;
  for (let i = 0; i < values.length; i++) {
    if (!seeded) {
      if (i < period - 1) continue;
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      prev = s / period;
      out[i] = prev;
      seeded = true;
      continue;
    }
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const line = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const sig = ema(
    line.map((v) => (Number.isFinite(v) ? v : 0)),
    signal,
  );
  const hist = line.map((v, i) => v - sig[i]);
  return { line, signal: sig, hist };
}

export function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - mid[i];
      v += d * d;
    }
    const sd = Math.sqrt(v / period);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { mid, upper, lower };
}

export function atr(candles: Candle[], period = 14): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  const tr: number[] = new Array(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr[i] = candles[i].h - candles[i].l;
      continue;
    }
    const prev = candles[i - 1].c;
    tr[i] = Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - prev),
      Math.abs(candles[i].l - prev),
    );
  }
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      sum += tr[i];
      if (i === period - 1) out[i] = sum / period;
      continue;
    }
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

export function stochastic(candles: Candle[], period = 14, smooth = 3) {
  const kRaw: number[] = new Array(candles.length).fill(NaN);
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, candles[j].h);
      lo = Math.min(lo, candles[j].l);
    }
    kRaw[i] = hi === lo ? 50 : ((candles[i].c - lo) / (hi - lo)) * 100;
  }
  const k = sma(
    kRaw.map((v) => (Number.isFinite(v) ? v : 0)),
    smooth,
  );
  const d = sma(
    k.map((v) => (Number.isFinite(v) ? v : 0)),
    smooth,
  );
  return { k, d };
}

export function adx(candles: Candle[], period = 14): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < period + 2) return out;
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].h - candles[i - 1].h;
    const down = candles[i - 1].l - candles[i].l;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    const prev = candles[i - 1].c;
    tr.push(
      Math.max(
        candles[i].h - candles[i].l,
        Math.abs(candles[i].h - prev),
        Math.abs(candles[i].l - prev),
      ),
    );
  }
  const sm = (arr: number[]) => {
    const r: number[] = new Array(arr.length).fill(NaN);
    let s = 0;
    for (let i = 0; i < arr.length; i++) {
      if (i < period) {
        s += arr[i];
        if (i === period - 1) r[i] = s;
        continue;
      }
      r[i] = r[i - 1] - r[i - 1] / period + arr[i];
    }
    return r;
  };
  const str = sm(tr);
  const sp = sm(plusDM);
  const smn = sm(minusDM);
  const dx: number[] = new Array(candles.length).fill(NaN);
  for (let i = 0; i < str.length; i++) {
    if (!Number.isFinite(str[i]) || str[i] === 0) continue;
    const pdi = (100 * sp[i]) / str[i];
    const mdi = (100 * smn[i]) / str[i];
    const den = pdi + mdi;
    dx[i + 1] = den === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / den;
  }
  let acc = 0;
  let count = 0;
  let prev = NaN;
  for (let i = 0; i < dx.length; i++) {
    if (!Number.isFinite(dx[i])) continue;
    if (count < period) {
      acc += dx[i];
      count++;
      if (count === period) {
        prev = acc / period;
        out[i] = prev;
      }
      continue;
    }
    prev = (prev * (period - 1) + dx[i]) / period;
    out[i] = prev;
  }
  return out;
}

function swings(candles: Candle[], left = 3, right = 3) {
  const highs: { i: number; price: number }[] = [];
  const lows: { i: number; price: number }[] = [];
  for (let i = left; i < candles.length - right; i++) {
    let isH = true;
    let isL = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (candles[j].h >= candles[i].h) isH = false;
      if (candles[j].l <= candles[i].l) isL = false;
    }
    if (isH) highs.push({ i, price: candles[i].h });
    if (isL) lows.push({ i, price: candles[i].l });
  }
  return { highs, lows };
}

function finite(n: number | undefined, fallback = 0): number {
  return n !== undefined && Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function candlePattern(candles: Candle[]): Factor {
  const a = last(candles, 2);
  const b = last(candles);
  if (!a || !b) {
    return { id: "pattern", label: "Candle", vote: "WAIT", score: 0, note: "Insufficient bars" };
  }
  const body = Math.abs(b.c - b.o);
  const range = b.h - b.l || 1e-9;
  const lowerWick = Math.min(b.o, b.c) - b.l;
  const upperWick = b.h - Math.max(b.o, b.c);
  const bullEngulf = b.c > b.o && a.c < a.o && b.c >= a.o && b.o <= a.c && body > Math.abs(a.c - a.o);
  const bearEngulf = b.c < b.o && a.c > a.o && b.c <= a.o && b.o >= a.c && body > Math.abs(a.c - a.o);
  const hammer = lowerWick > body * 2 && upperWick < body * 0.6 && b.c >= b.o;
  const star = upperWick > body * 2 && lowerWick < body * 0.6 && b.c <= b.o;
  if (bullEngulf) {
    return { id: "pattern", label: "Candle", vote: "LONG", score: 8, note: "Bullish engulfing" };
  }
  if (bearEngulf) {
    return { id: "pattern", label: "Candle", vote: "SHORT", score: 8, note: "Bearish engulfing" };
  }
  if (hammer) {
    return { id: "pattern", label: "Candle", vote: "LONG", score: 6, note: "Hammer rejection" };
  }
  if (star) {
    return { id: "pattern", label: "Candle", vote: "SHORT", score: 6, note: "Shooting star" };
  }
  if (body / range < 0.2) {
    return { id: "pattern", label: "Candle", vote: "WAIT", score: 2, note: "Doji / indecision" };
  }
  return {
    id: "pattern",
    label: "Candle",
    vote: b.c >= b.o ? "LONG" : "SHORT",
    score: 3,
    note: b.c >= b.o ? "Close in upper half" : "Close in lower half",
  };
}

export function analyze(candlesIn: Candle[]): SignalReport | null {
  if (candlesIn.length < 60) return null;
  const forming = candlesIn[candlesIn.length - 1];
  const candles = candlesIn.slice(0, -1);
  if (candles.length < 60) return null;

  const closes = candles.map((c) => c.c);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);
  const rsiV = rsi(closes, 14);
  const macdV = macd(closes);
  const bb = bollinger(closes, 20, 2);
  const atrV = atr(candles, 14);
  const stoch = stochastic(candles);
  const adxV = adx(candles, 14);
  const { highs, lows } = swings(candles);

  const i = candles.length - 1;
  const price = forming.c;
  const e9 = finite(ema9[i]);
  const e21 = finite(ema21[i]);
  const e50 = finite(ema50[i]);
  const r = finite(rsiV[i], 50);
  const rPrev = finite(rsiV[i - 1], r);
  const hist = finite(macdV.hist[i]);
  const histPrev = finite(macdV.hist[i - 1]);
  const macdLine = finite(macdV.line[i]);
  const macdSig = finite(macdV.signal[i]);
  const k = finite(stoch.k[i], 50);
  const d = finite(stoch.d[i], 50);
  const kPrev = finite(stoch.k[i - 1], k);
  const a = finite(atrV[i], price * 0.01);
  const adxNow = finite(adxV[i], 15);
  const bbU = finite(bb.upper[i], price * 1.02);
  const bbL = finite(bb.lower[i], price * 0.98);

  const res = highs.length ? highs[highs.length - 1].price : Math.max(...closes.slice(-40));
  const sup = lows.length ? lows[lows.length - 1].price : Math.min(...closes.slice(-40));

  const factors: Factor[] = [];

  if (e9 > e21 && e21 > e50) {
    factors.push({
      id: "trend",
      label: "EMA stack",
      vote: "LONG",
      score: 22,
      note: "9 > 21 > 50 — trend aligned up",
    });
  } else if (e9 < e21 && e21 < e50) {
    factors.push({
      id: "trend",
      label: "EMA stack",
      vote: "SHORT",
      score: 22,
      note: "9 < 21 < 50 — trend aligned down",
    });
  } else if (e9 > e21) {
    factors.push({
      id: "trend",
      label: "EMA stack",
      vote: "LONG",
      score: 10,
      note: "Fast EMA above 21, 50 not confirmed",
    });
  } else if (e9 < e21) {
    factors.push({
      id: "trend",
      label: "EMA stack",
      vote: "SHORT",
      score: 10,
      note: "Fast EMA below 21, 50 not confirmed",
    });
  } else {
    factors.push({
      id: "trend",
      label: "EMA stack",
      vote: "WAIT",
      score: 4,
      note: "Moving averages compressed",
    });
  }

  const macdCrossUp = macdLine > macdSig && finite(macdV.line[i - 1]) <= finite(macdV.signal[i - 1]);
  const macdCrossDn = macdLine < macdSig && finite(macdV.line[i - 1]) >= finite(macdV.signal[i - 1]);
  if (hist > 0 && macdLine > macdSig) {
    factors.push({
      id: "macd",
      label: "MACD",
      vote: "LONG",
      score: macdCrossUp ? 16 : hist > histPrev ? 13 : 9,
      note: macdCrossUp ? "Bullish cross" : "Histogram above zero",
    });
  } else if (hist < 0 && macdLine < macdSig) {
    factors.push({
      id: "macd",
      label: "MACD",
      vote: "SHORT",
      score: macdCrossDn ? 16 : hist < histPrev ? 13 : 9,
      note: macdCrossDn ? "Bearish cross" : "Histogram below zero",
    });
  } else {
    factors.push({
      id: "macd",
      label: "MACD",
      vote: "WAIT",
      score: 4,
      note: "MACD mixed versus signal",
    });
  }

  if (r < 32 && r > rPrev) {
    factors.push({ id: "rsi", label: "RSI", vote: "LONG", score: 14, note: `Oversold bounce (${r.toFixed(0)})` });
  } else if (r > 68 && r < rPrev) {
    factors.push({ id: "rsi", label: "RSI", vote: "SHORT", score: 14, note: `Overbought fade (${r.toFixed(0)})` });
  } else if (r >= 52 && r <= 68 && r >= rPrev) {
    factors.push({ id: "rsi", label: "RSI", vote: "LONG", score: 10, note: `Bullish momentum (${r.toFixed(0)})` });
  } else if (r <= 48 && r >= 32 && r <= rPrev) {
    factors.push({ id: "rsi", label: "RSI", vote: "SHORT", score: 10, note: `Bearish momentum (${r.toFixed(0)})` });
  } else {
    factors.push({ id: "rsi", label: "RSI", vote: "WAIT", score: 5, note: `Neutral band (${r.toFixed(0)})` });
  }

  if (k < 25 && k > d && kPrev <= finite(stoch.d[i - 1], d)) {
    factors.push({ id: "stoch", label: "Stochastic", vote: "LONG", score: 10, note: "K crossed D in oversold" });
  } else if (k > 75 && k < d && kPrev >= finite(stoch.d[i - 1], d)) {
    factors.push({ id: "stoch", label: "Stochastic", vote: "SHORT", score: 10, note: "K crossed D in overbought" });
  } else if (k > d) {
    factors.push({ id: "stoch", label: "Stochastic", vote: "LONG", score: 5, note: "K holding above D" });
  } else {
    factors.push({ id: "stoch", label: "Stochastic", vote: "SHORT", score: 5, note: "K holding below D" });
  }

  const bbPos = (price - bbL) / (bbU - bbL || 1);
  if (price <= bbL * 1.002 && r < 40) {
    factors.push({ id: "bb", label: "Bollinger", vote: "LONG", score: 10, note: "Tag of lower band" });
  } else if (price >= bbU * 0.998 && r > 60) {
    factors.push({ id: "bb", label: "Bollinger", vote: "SHORT", score: 10, note: "Tag of upper band" });
  } else if (bbPos > 0.55) {
    factors.push({ id: "bb", label: "Bollinger", vote: "LONG", score: 5, note: "Trading in upper band" });
  } else if (bbPos < 0.45) {
    factors.push({ id: "bb", label: "Bollinger", vote: "SHORT", score: 5, note: "Trading in lower band" });
  } else {
    factors.push({ id: "bb", label: "Bollinger", vote: "WAIT", score: 3, note: "Mid-band balance" });
  }

  const nearSup = Math.abs(price - sup) / price < 0.004 || price > sup;
  if (price > res && e9 > e21) {
    factors.push({ id: "struct", label: "Structure", vote: "LONG", score: 14, note: "Break of recent swing high" });
  } else if (price < sup && e9 < e21) {
    factors.push({ id: "struct", label: "Structure", vote: "SHORT", score: 14, note: "Break of recent swing low" });
  } else if (nearSup && price >= sup && r < 45) {
    factors.push({ id: "struct", label: "Structure", vote: "LONG", score: 9, note: "Holding last support" });
  } else if (price <= res && r > 55) {
    factors.push({ id: "struct", label: "Structure", vote: "SHORT", score: 9, note: "Capped by last resistance" });
  } else {
    factors.push({ id: "struct", label: "Structure", vote: "WAIT", score: 4, note: "Range between swing points" });
  }

  if (adxNow >= 22) {
    const vote: Bias = e9 > e21 ? "LONG" : e9 < e21 ? "SHORT" : "WAIT";
    factors.push({
      id: "adx",
      label: "ADX",
      vote,
      score: vote === "WAIT" ? 4 : 8,
      note: `Trend strength ${adxNow.toFixed(0)}`,
    });
  } else {
    factors.push({
      id: "adx",
      label: "ADX",
      vote: "WAIT",
      score: 4,
      note: `Weak trend (${adxNow.toFixed(0)}) — fade extremes`,
    });
  }

  factors.push(candlePattern(candles));

  let longScore = 0;
  let shortScore = 0;
  let aligned = 0;
  for (const f of factors) {
    if (f.vote === "LONG") {
      longScore += f.score;
      aligned++;
    } else if (f.vote === "SHORT") {
      shortScore += f.score;
      aligned++;
    }
  }

  const spread = Math.abs(longScore - shortScore);
  let bias: Bias = "WAIT";
  if (longScore >= 38 && longScore - shortScore >= 8) bias = "LONG";
  else if (shortScore >= 38 && shortScore - longScore >= 8) bias = "SHORT";

  const winner = Math.max(longScore, shortScore);
  let confidence = 0;
  if (bias === "WAIT") {
    confidence = clamp(Math.round(32 + spread * 0.4), 18, 49);
  } else {
    confidence = clamp(Math.round(winner * 0.72 + spread * 0.35), 50, 96);
    if (adxNow < 16) confidence = Math.min(confidence, 68);
  }

  const alignedDir = factors.filter((f) => f.vote === bias).length;
  let grade: Grade = "Low";
  if (bias !== "WAIT" && confidence >= 70 && alignedDir >= 4 && adxNow >= 18) grade = "High";
  else if (bias !== "WAIT" && confidence >= 55) grade = "Medium";

  const minStop = price * (price > 20 ? 0.0018 : 0.0008);
  const stopDist = Math.max(a * 1.45, minStop);
  const entry = price;
  let stop = bias === "SHORT" ? entry + stopDist : entry - stopDist;
  if (bias === "LONG" && sup < entry) stop = Math.min(stop, sup - a * 0.12);
  if (bias === "SHORT" && res > entry) stop = Math.max(stop, res + a * 0.12);
  const risk = Math.abs(entry - stop) || price * 0.002;
  const takeProfit1 = bias === "SHORT" ? entry - risk * 1.85 : entry + risk * 1.85;
  const takeProfit2 = bias === "SHORT" ? entry - risk * 2.9 : entry + risk * 2.9;
  if (bias === "WAIT") {
    stop = entry - stopDist;
  }

  const riskPct = (risk / entry) * 100;
  const rewardPct1 = (Math.abs(takeProfit1 - entry) / entry) * 100;

  const thesis =
    bias === "WAIT"
      ? `Factors are split (${longScore.toFixed(0)} long vs ${shortScore.toFixed(0)} short). Wait for EMA and MACD to agree before committing size.`
      : `${alignedDir} of ${factors.length} factors vote ${bias}. ${factors
          .filter((f) => f.vote === bias)
          .slice(0, 3)
          .map((f) => f.note)
          .join(" · ")}.`;

  const invalidation =
    bias === "LONG"
      ? `Setup fails on a close below ${stop.toFixed(6)} or a loss of the 21 EMA while RSI rolls over.`
      : bias === "SHORT"
        ? `Setup fails on a close above ${stop.toFixed(6)} or a reclaim of the 21 EMA while RSI turns up.`
        : "No trade until spread between long and short scores exceeds the wait threshold.";

  return {
    bias,
    confidence,
    grade,
    aligned: alignedDir,
    factors,
    entry,
    stop,
    takeProfit1,
    takeProfit2,
    atr: a,
    rsi: r,
    adx: adxNow,
    ema9: e9,
    ema21: e21,
    ema50: e50,
    macdHist: hist,
    support: sup,
    resistance: res,
    riskPct,
    rewardPct1,
    rr1: 1.85,
    rr2: 2.9,
    thesis,
    invalidation,
  };
}

export function backtest(candlesIn: Candle[]): BacktestSummary {
  const empty = { trades: 0, wins: 0, losses: 0, scratches: 0, winRate: 0, avgR: 0, expectancy: 0 };
  if (candlesIn.length < 80) return empty;
  let wins = 0;
  let losses = 0;
  let scratches = 0;
  let rSum = 0;
  let lastTaken = -99;
  for (let i = 60; i < candlesIn.length - 8; i++) {
    if (i - lastTaken < 4) continue;
    const slice = candlesIn.slice(0, i + 1);
    const sig = analyze(slice);
    if (!sig || sig.bias === "WAIT" || sig.confidence < 58) continue;
    lastTaken = i;
    const risk = Math.abs(sig.entry - sig.stop) || 1e-9;
    const tp = sig.takeProfit1;
    const sl = sig.stop;
    let result: "win" | "loss" | "scratch" = "scratch";
    let r = 0;
    for (let j = i + 1; j < Math.min(candlesIn.length, i + 13); j++) {
      const bar = candlesIn[j];
      if (sig.bias === "LONG") {
        const hitSl = bar.l <= sl;
        const hitTp = bar.h >= tp;
        if (hitSl && hitTp) {
          result = "loss";
          r = -1;
          break;
        }
        if (hitSl) {
          result = "loss";
          r = -1;
          break;
        }
        if (hitTp) {
          result = "win";
          r = Math.abs(tp - sig.entry) / risk;
          break;
        }
      } else {
        const hitSl = bar.h >= sl;
        const hitTp = bar.l <= tp;
        if (hitSl && hitTp) {
          result = "loss";
          r = -1;
          break;
        }
        if (hitSl) {
          result = "loss";
          r = -1;
          break;
        }
        if (hitTp) {
          result = "win";
          r = Math.abs(sig.entry - tp) / risk;
          break;
        }
      }
    }
    if (result === "win") wins++;
    else if (result === "loss") losses++;
    else scratches++;
    rSum += r;
  }
  const trades = wins + losses + scratches;
  const decided = wins + losses;
  const winRate = decided === 0 ? 0 : (wins / decided) * 100;
  const avgR = trades === 0 ? 0 : rSum / trades;
  const expectancy = avgR;
  return { trades, wins, losses, scratches, winRate, avgR, expectancy };
}

export function planTrade(
  pair: Pair,
  interval: Interval,
  signal: SignalReport,
  bt: BacktestSummary,
  tradeValue: number,
  riskPctInput: number,
): TradePlan {
  const value = Math.max(0, tradeValue);
  const riskFrac = clamp(riskPctInput, 0.1, 8) / 100;
  const entry = signal.entry;
  const stopDist = Math.abs(signal.entry - signal.stop) || entry * 0.002;
  const riskBudget = value * riskFrac;
  let units = stopDist > 0 ? riskBudget / stopDist : 0;
  if (signal.bias === "WAIT") units = 0;
  const notional = units * entry;
  const dollarRisk = units * stopDist;
  const dollarReward1 = units * Math.abs(signal.takeProfit1 - entry);
  const dollarReward2 = units * Math.abs(signal.takeProfit2 - entry);
  const feeRate = pair.kind === "crypto" ? 0.001 : 0.00008;
  const fees = notional * feeRate * 2;
  const netReward1 = dollarReward1 - fees;
  const riskOfValue = value > 0 ? (dollarRisk / value) * 100 : 0;

  let recommendation: TradePlan["recommendation"] = "PASS";
  let recNote = "No directional edge — keep powder dry.";
  if (signal.bias !== "WAIT") {
    if (signal.grade === "High" && signal.confidence >= 72 && bt.winRate >= 52 && bt.trades >= 6) {
      recommendation = "TAKE";
      recNote = "High confluence and recent sample supports the setup. Size to the risk budget.";
    } else if (signal.confidence >= 58 && signal.grade !== "Low") {
      recommendation = "REDUCE";
      recNote = "Workable tape, but not A-grade. Cut size or wait for a cleaner retest.";
    } else {
      recommendation = "PASS";
      recNote = "Confidence or recent hit-rate is too thin to justify the stop distance.";
    }
    if (riskOfValue > 2.4 && recommendation === "TAKE") {
      recommendation = "REDUCE";
      recNote = "Confluence is fine, but this size spends more than 2% of the ticket if stopped.";
    }
  }

  const mins = intervalMinutes(interval);
  const holdHint =
    signal.bias === "WAIT"
      ? "Stand aside this bar."
      : `Typical hold is ${Math.max(2, Math.round(6))}–${Math.round(12)} bars (${mins * 6}–${mins * 12} minutes on this timeframe).`;

  return {
    pair,
    interval,
    signal,
    backtest: bt,
    tradeValue: value,
    riskPctInput,
    units,
    notional,
    dollarRisk,
    dollarReward1,
    dollarReward2,
    riskOfValue,
    fees,
    netReward1,
    recommendation,
    recNote,
    holdHint,
  };
}

export function emaSeries(candles: Candle[], period: number): { t: number; value: number }[] {
  const closes = candles.map((c) => c.c);
  const e = ema(closes, period);
  const out: { t: number; value: number }[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (Number.isFinite(e[i])) out.push({ t: candles[i].t, value: e[i] });
  }
  return out;
}

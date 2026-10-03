export type MarketKind = "crypto" | "forex";
export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type Pair = {
  id: string;
  symbol: string;
  name: string;
  kind: MarketKind;
  base: string;
  quote: string;
  coinbase?: string;
  okx?: string;
  kraken?: string;
  fxFrom?: string;
  fxTo?: string;
  pip: number;
  decimals: number;
};

export const INTERVALS: { id: Interval; label: string; minutes: number }[] = [
  { id: "1m", label: "1m", minutes: 1 },
  { id: "5m", label: "5m", minutes: 5 },
  { id: "15m", label: "15m", minutes: 15 },
  { id: "1h", label: "1H", minutes: 60 },
  { id: "4h", label: "4H", minutes: 240 },
  { id: "1d", label: "1D", minutes: 1440 },
];

export const PAIRS: Pair[] = [
  {
    id: "BTC-USD",
    symbol: "BTC/USD",
    name: "Bitcoin",
    kind: "crypto",
    base: "BTC",
    quote: "USD",
    coinbase: "BTC-USD",
    okx: "BTC-USDT",
    kraken: "XBTUSD",
    pip: 0.1,
    decimals: 2,
  },
  {
    id: "ETH-USD",
    symbol: "ETH/USD",
    name: "Ethereum",
    kind: "crypto",
    base: "ETH",
    quote: "USD",
    coinbase: "ETH-USD",
    okx: "ETH-USDT",
    kraken: "ETHUSD",
    pip: 0.01,
    decimals: 2,
  },
  {
    id: "SOL-USD",
    symbol: "SOL/USD",
    name: "Solana",
    kind: "crypto",
    base: "SOL",
    quote: "USD",
    coinbase: "SOL-USD",
    okx: "SOL-USDT",
    kraken: "SOLUSD",
    pip: 0.001,
    decimals: 3,
  },
  {
    id: "XRP-USD",
    symbol: "XRP/USD",
    name: "XRP",
    kind: "crypto",
    base: "XRP",
    quote: "USD",
    coinbase: "XRP-USD",
    okx: "XRP-USDT",
    kraken: "XRPUSD",
    pip: 0.0001,
    decimals: 4,
  },
  {
    id: "ADA-USD",
    symbol: "ADA/USD",
    name: "Cardano",
    kind: "crypto",
    base: "ADA",
    quote: "USD",
    coinbase: "ADA-USD",
    okx: "ADA-USDT",
    kraken: "ADAUSD",
    pip: 0.0001,
    decimals: 4,
  },
  {
    id: "DOGE-USD",
    symbol: "DOGE/USD",
    name: "Dogecoin",
    kind: "crypto",
    base: "DOGE",
    quote: "USD",
    coinbase: "DOGE-USD",
    okx: "DOGE-USDT",
    kraken: "DOGEUSD",
    pip: 0.00001,
    decimals: 5,
  },
  {
    id: "LINK-USD",
    symbol: "LINK/USD",
    name: "Chainlink",
    kind: "crypto",
    base: "LINK",
    quote: "USD",
    coinbase: "LINK-USD",
    okx: "LINK-USDT",
    kraken: "LINKUSD",
    pip: 0.001,
    decimals: 3,
  },
  {
    id: "AVAX-USD",
    symbol: "AVAX/USD",
    name: "Avalanche",
    kind: "crypto",
    base: "AVAX",
    quote: "USD",
    coinbase: "AVAX-USD",
    okx: "AVAX-USDT",
    kraken: "AVAXUSD",
    pip: 0.001,
    decimals: 3,
  },
  {
    id: "LTC-USD",
    symbol: "LTC/USD",
    name: "Litecoin",
    kind: "crypto",
    base: "LTC",
    quote: "USD",
    coinbase: "LTC-USD",
    okx: "LTC-USDT",
    kraken: "LTCUSD",
    pip: 0.01,
    decimals: 2,
  },
  {
    id: "AAVE-USD",
    symbol: "AAVE/USD",
    name: "Aave",
    kind: "crypto",
    base: "AAVE",
    quote: "USD",
    coinbase: "AAVE-USD",
    okx: "AAVE-USDT",
    kraken: "AAVEUSD",
    pip: 0.01,
    decimals: 2,
  },
  {
    id: "EUR-USD",
    symbol: "EUR/USD",
    name: "Euro",
    kind: "forex",
    base: "EUR",
    quote: "USD",
    fxFrom: "EUR",
    fxTo: "USD",
    pip: 0.0001,
    decimals: 5,
  },
  {
    id: "GBP-USD",
    symbol: "GBP/USD",
    name: "Sterling",
    kind: "forex",
    base: "GBP",
    quote: "USD",
    fxFrom: "GBP",
    fxTo: "USD",
    pip: 0.0001,
    decimals: 5,
  },
  {
    id: "USD-JPY",
    symbol: "USD/JPY",
    name: "Dollar Yen",
    kind: "forex",
    base: "USD",
    quote: "JPY",
    fxFrom: "USD",
    fxTo: "JPY",
    pip: 0.01,
    decimals: 3,
  },
  {
    id: "AUD-USD",
    symbol: "AUD/USD",
    name: "Aussie",
    kind: "forex",
    base: "AUD",
    quote: "USD",
    fxFrom: "AUD",
    fxTo: "USD",
    pip: 0.0001,
    decimals: 5,
  },
  {
    id: "USD-CHF",
    symbol: "USD/CHF",
    name: "Dollar Swiss",
    kind: "forex",
    base: "USD",
    quote: "CHF",
    fxFrom: "USD",
    fxTo: "CHF",
    pip: 0.0001,
    decimals: 5,
  },
  {
    id: "USD-CAD",
    symbol: "USD/CAD",
    name: "Dollar Loonie",
    kind: "forex",
    base: "USD",
    quote: "CAD",
    fxFrom: "USD",
    fxTo: "CAD",
    pip: 0.0001,
    decimals: 5,
  },
  {
    id: "NZD-USD",
    symbol: "NZD/USD",
    name: "Kiwi",
    kind: "forex",
    base: "NZD",
    quote: "USD",
    fxFrom: "NZD",
    fxTo: "USD",
    pip: 0.0001,
    decimals: 5,
  },
  {
    id: "EUR-GBP",
    symbol: "EUR/GBP",
    name: "Euro Sterling",
    kind: "forex",
    base: "EUR",
    quote: "GBP",
    fxFrom: "EUR",
    fxTo: "GBP",
    pip: 0.0001,
    decimals: 5,
  },
  {
    id: "EUR-JPY",
    symbol: "EUR/JPY",
    name: "Euro Yen",
    kind: "forex",
    base: "EUR",
    quote: "JPY",
    fxFrom: "EUR",
    fxTo: "JPY",
    pip: 0.01,
    decimals: 3,
  },
  {
    id: "GBP-JPY",
    symbol: "GBP/JPY",
    name: "Sterling Yen",
    kind: "forex",
    base: "GBP",
    quote: "JPY",
    fxFrom: "GBP",
    fxTo: "JPY",
    pip: 0.01,
    decimals: 3,
  },
];

export const CRYPTO_PAIRS = PAIRS.filter((p) => p.kind === "crypto");
export const FOREX_PAIRS = PAIRS.filter((p) => p.kind === "forex");

export function getPair(id: string): Pair {
  return PAIRS.find((p) => p.id === id) ?? PAIRS[0];
}

export function intervalMinutes(id: Interval): number {
  return INTERVALS.find((i) => i.id === id)?.minutes ?? 15;
}

export type SessionInfo = {
  name: string;
  detail: string;
  active: boolean;
};

export function marketSession(now = new Date()): SessionInfo {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sydney = h >= 21 || h < 6;
  const tokyo = h >= 0 && h < 9;
  const london = h >= 7 && h < 16;
  const ny = h >= 12 && h < 21;
  const open: string[] = [];
  if (sydney) open.push("Sydney");
  if (tokyo) open.push("Tokyo");
  if (london) open.push("London");
  if (ny) open.push("New York");
  if (open.length === 0) {
    return { name: "Quiet hours", detail: "Between major FX sessions", active: false };
  }
  const overlap = london && ny;
  return {
    name: overlap ? "London / New York" : open[0],
    detail: overlap ? "Peak liquidity overlap" : `${open.join(" · ")} open`,
    active: true,
  };
}

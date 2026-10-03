import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Activity, BookOpen, Clock3, Layers, ListFilter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { requestBriefing } from "@/lib/briefing";
import { loadDesk, type DeskPayload, type Ticker } from "@/lib/desk";
import { analyze, backtest, planTrade, type SignalReport, type TradePlan } from "@/lib/engine";
import { formatClock, formatMoney, formatPct, formatPrice, formatQty } from "@/lib/format";
import {
  CRYPTO_PAIRS,
  FOREX_PAIRS,
  INTERVALS,
  getPair,
  marketSession,
  type Interval,
  type MarketKind,
  type Pair,
} from "@/lib/markets";
import { cn } from "@/lib/utils";
import { PriceChart } from "@/components/desk/price-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HISTORY_KEY = "meridian-history-v1";

type HistoryItem = {
  id: string;
  at: number;
  pair: string;
  bias: string;
  confidence: number;
  value: number;
  rec: string;
};

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function biasVariant(bias: string) {
  if (bias === "LONG") return "long" as const;
  if (bias === "SHORT") return "short" as const;
  return "wait" as const;
}

export function DeskApp({ initial }: { initial?: DeskPayload }) {
  const [kind, setKind] = useState<MarketKind>("crypto");
  const [pairId, setPairId] = useState(initial?.pairId ?? "BTC-USD");
  const [interval, setInterval] = useState<Interval>(initial?.interval ?? "15m");
  const [tradeValue, setTradeValue] = useState("2500");
  const [riskPct, setRiskPct] = useState(1);
  const [plan, setPlan] = useState<TradePlan | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [brief, setBrief] = useState<string | null>(null);

  const pair = getPair(pairId);
  const session = now
    ? marketSession(new Date(now))
    : { name: "Live desk", detail: "Watching the tape", active: true };

  useEffect(() => {
    setHistory(loadHistory());
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const desk = useQuery({
    queryKey: ["desk", pairId, interval],
    queryFn: () => loadDesk({ data: { pairId, interval } }),
    refetchInterval: 9000,
    initialData:
      initial && pairId === initial.pairId && interval === initial.interval ? initial : undefined,
    initialDataUpdatedAt: initial?.asOf,
  });

  const signal = useMemo<SignalReport | null>(() => {
    if (!desk.data?.candles) return null;
    return analyze(desk.data.candles);
  }, [desk.data?.candles]);

  const sample = useMemo(() => {
    if (!desk.data?.candles) return null;
    return backtest(desk.data.candles);
  }, [desk.data?.candles]);

  const briefing = useMutation({
    mutationFn: async () => {
      if (!signal || !plan) throw new Error("Analyze a trade first");
      const snapshot = [
        `Pair ${pair.symbol} ${interval}`,
        `Bias ${signal.bias} confidence ${signal.confidence} grade ${signal.grade}`,
        `Entry ${signal.entry} stop ${signal.stop} tp1 ${signal.takeProfit1}`,
        `RSI ${signal.rsi.toFixed(1)} ADX ${signal.adx.toFixed(1)}`,
        `Trade value ${plan.tradeValue} risk ${plan.riskPctInput}%`,
        `Recent sample win rate ${plan.backtest.winRate.toFixed(1)}% on ${plan.backtest.trades} trades`,
        `Thesis: ${signal.thesis}`,
      ].join("\n");
      return requestBriefing({ data: { snapshot } });
    },
    onSuccess: (res) => {
      setBrief(res.ok ? res.text : res.error);
    },
  });

  function onSelect(next: Pair) {
    setKind(next.kind);
    setPairId(next.id);
    setPlan(null);
    setBrief(null);
  }

  function runAnalysis() {
    if (!signal || !sample) return;
    const value = Number(tradeValue.replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) return;
    const next = planTrade(pair, interval, signal, sample, value, riskPct);
    setPlan(next);
    const item: HistoryItem = {
      id: `${Date.now()}`,
      at: Date.now(),
      pair: pair.symbol,
      bias: signal.bias,
      confidence: signal.confidence,
      value,
      rec: next.recommendation,
    };
    const hist = [item, ...history].slice(0, 24);
    setHistory(hist);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    requestAnimationFrame(() => {
      document.getElementById("trade-analysis")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  const tickers = desk.data?.tickers ?? [];
  const list = kind === "crypto" ? CRYPTO_PAIRS : FOREX_PAIRS;
  const quote = desk.data?.quote;
  const price = quote?.price ?? signal?.entry ?? 0;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open markets">
                <ListFilter />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col gap-4 pt-12">
              <MarketList
                kind={kind}
                onKind={setKind}
                pairId={pairId}
                onSelect={onSelect}
                tickers={tickers}
              />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="font-display text-xl leading-none tracking-tight italic sm:text-2xl">Meridian</p>
            <p className="mt-1 text-[11px] tracking-wide text-muted uppercase">Live crypto & forex desk</p>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <div className="text-right">
              <p className="text-[11px] tracking-wide text-muted uppercase">{session.name}</p>
              <p className="text-xs text-fg">{session.detail}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="live-dot size-1.5 rounded-full bg-long" />
              <Clock3 className="size-3.5" />
              <span className="tabular">{now ? formatClock(now) : "--:--:--"}</span>
            </div>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link to="/codes">
              <BookOpen />
              Codes
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-12 lg:gap-5 lg:py-5">
        <aside className="hidden lg:col-span-3 lg:block xl:col-span-2">
          <div className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
            <MarketList
              kind={kind}
              onKind={setKind}
              pairId={pairId}
              onSelect={onSelect}
              tickers={tickers}
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-4 lg:col-span-6 xl:col-span-7">
          <div className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] tracking-wide text-muted uppercase">{pair.name}</p>
                <h1 className="font-display text-3xl leading-none tracking-tight">{pair.symbol}</h1>
              </div>
              <div className="text-right">
                <p className="tabular text-2xl leading-none">{price ? formatPrice(price, pair) : "—"}</p>
                <p
                  className={cn(
                    "mt-1 text-sm tabular",
                    (quote?.changePct ?? 0) >= 0 ? "text-long" : "text-short",
                  )}
                >
                  {quote ? formatPct(quote.changePct) : "scanning"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {INTERVALS.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={interval === item.id ? "default" : "ghost"}
                  onClick={() => {
                    setInterval(item.id);
                    setPlan(null);
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <span className="ml-auto text-[11px] text-faint">{desk.data?.source ?? "Connecting"}</span>
            </div>

            <div className="relative mt-3 h-64 overflow-hidden rounded-lg bg-bg sm:h-80 lg:h-96">
              {desk.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-px w-2/3 overflow-hidden bg-border">
                    <div className="scan-bar absolute inset-y-0 w-1/3 bg-accent/80" />
                  </div>
                </div>
              )}
              {desk.data?.candles && desk.data.candles.length > 2 ? (
                <PriceChart candles={desk.data.candles} className="h-full w-full" />
              ) : desk.isError ? (
                <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
                  Market feed paused. Retrying automatically.
                </p>
              ) : null}
            </div>
          </div>

          {signal && (
            <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] tracking-wide text-muted uppercase">Confluence</p>
                <span className="text-xs text-faint">{signal.aligned} aligned</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {signal.factors.map((f) => (
                  <div key={f.id} className="rounded-md bg-bg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted">{f.label}</p>
                      <Badge variant={biasVariant(f.vote)}>{f.vote}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-snug text-fg">{f.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:col-span-3 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto xl:col-span-3">
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-wide text-muted uppercase">Live signal</p>
                <p className="mt-1 font-display text-3xl leading-none tracking-tight">
                  {signal?.bias ?? "—"}
                </p>
              </div>
              <Badge variant={biasVariant(signal?.bias ?? "WAIT")} className="mt-1">
                {signal?.grade ?? "—"} grade
              </Badge>
            </div>
            <div className="mt-3">
              <div className="flex items-end justify-between">
                <span className="text-xs text-muted">Confidence</span>
                <span className="tabular text-lg">{signal ? `${signal.confidence}` : "—"}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-full",
                    signal?.bias === "LONG" && "bg-long",
                    signal?.bias === "SHORT" && "bg-short",
                    (!signal || signal.bias === "WAIT") && "bg-muted",
                  )}
                  style={{ width: `${signal?.confidence ?? 0}%` }}
                />
              </div>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
              {signal?.thesis ?? "Waiting for tape."}
            </p>
            {signal && (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Entry" value={formatPrice(signal.entry, pair)} />
                <Metric label="Stop" value={formatPrice(signal.stop, pair)} />
                <Metric label="Target" value={formatPrice(signal.takeProfit1, pair)} />
              </dl>
            )}
            <Separator className="my-4" />
            <p className="text-xs tracking-wide text-muted uppercase">Trade ticket</p>
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="trade-value">Trade value (USD)</Label>
                <Input
                  id="trade-value"
                  inputMode="decimal"
                  value={tradeValue}
                  onChange={(e) => setTradeValue(e.target.value)}
                  placeholder="2500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Risk at stop</Label>
                  <span className="tabular text-sm">{riskPct.toFixed(2)}%</span>
                </div>
                <Slider
                  min={0.25}
                  max={3}
                  step={0.05}
                  value={[riskPct]}
                  onValueChange={(v) => setRiskPct(v[0] ?? 1)}
                />
              </div>
              <Button className="w-full" onClick={runAnalysis} disabled={!signal}>
                <Activity />
                Analyze trade
              </Button>
            </div>
          </div>

          {plan && (
            <div id="trade-analysis" className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-wide text-muted uppercase">Full analysis</p>
                <Badge
                  variant={
                    plan.recommendation === "TAKE" ? "long" : plan.recommendation === "REDUCE" ? "wait" : "short"
                  }
                >
                  {plan.recommendation}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg">{plan.recNote}</p>
              {plan.backtest.trades > 0 && (
                <p className="mt-2 text-xs text-faint">
                  Recent sample: {plan.backtest.winRate.toFixed(0)}% of {plan.backtest.wins + plan.backtest.losses}{" "}
                  decided trades on this chart. Not a promise of future results.
                </p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-2">
                <Metric label="Size" value={formatQty(plan.units, pair)} />
                <Metric label="Notional" value={formatMoney(plan.notional)} />
                <Metric label="Stop risk" value={formatMoney(plan.dollarRisk)} />
                <Metric label="TP1 reward" value={formatMoney(plan.dollarReward1)} />
                <Metric label="TP2 reward" value={formatMoney(plan.dollarReward2)} />
                <Metric label="Est. round-turn" value={formatMoney(plan.fees)} />
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted">{plan.signal.invalidation}</p>
              <p className="mt-2 text-xs text-faint">{plan.holdHint}</p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => briefing.mutate()}
                disabled={briefing.isPending}
              >
                <Layers />
                {briefing.isPending ? "Writing briefing…" : "Desk briefing"}
              </Button>
              {brief && <p className="mt-3 text-sm leading-relaxed text-muted">{brief}</p>}
            </div>
          )}

          {history.length > 0 && (
            <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <p className="text-[11px] tracking-wide text-muted uppercase">Ticket log</p>
              <ul className="mt-3 space-y-2">
                {history.slice(0, 6).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted">{h.pair}</span>
                    <span className="tabular text-fg">{h.bias}</span>
                    <span className="tabular text-muted">{h.confidence}</span>
                    <span className="tabular">{formatMoney(h.value, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <footer className="border-t border-border px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-[1600px] text-xs leading-relaxed text-faint">
          Meridian is an educational desk. Signals are confluence scores from public market data, not financial
          advice and not a guarantee of accuracy or profit. Crypto prints are live exchange candles. Forex uses
          official daily ranges plus a live quote. You can lose money. Size from the stop, not from hope.
        </p>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg px-2 py-2.5">
      <dt className="text-[10px] tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 tabular text-sm">{value}</dd>
    </div>
  );
}

function MarketList({
  kind,
  onKind,
  pairId,
  onSelect,
  tickers,
}: {
  kind: MarketKind;
  onKind: (k: MarketKind) => void;
  pairId: string;
  onSelect: (p: Pair) => void;
  tickers: Ticker[];
}) {
  const list = kind === "crypto" ? CRYPTO_PAIRS : FOREX_PAIRS;
  const byId = new Map(tickers.map((t) => [t.id, t]));
  return (
    <div>
      <Tabs value={kind} onValueChange={(v) => onKind(v as MarketKind)}>
        <TabsList className="w-full">
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
          <TabsTrigger value="forex">Forex</TabsTrigger>
        </TabsList>
      </Tabs>
      <ScrollArea className="mt-3 h-[min(70vh,36rem)]">
        <ul className="space-y-1 pr-2">
          {list.map((p) => {
            const t = byId.get(p.id);
            const active = p.id === pairId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors duration-150",
                    active ? "bg-bg text-fg" : "text-muted hover:bg-bg hover:text-fg",
                  )}
                >
                  <span>
                    <span className="block text-sm">{p.symbol}</span>
                    <span className="block text-[11px] text-faint">{p.name}</span>
                  </span>
                  <span className="text-right">
                    <span className="block tabular text-sm text-fg">
                      {t ? formatPrice(t.price, p) : "—"}
                    </span>
                    <span
                      className={cn(
                        "block tabular text-[11px]",
                        (t?.changePct ?? 0) >= 0 ? "text-long" : "text-short",
                      )}
                    >
                      {t && p.kind === "crypto" ? formatPct(t.changePct) : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}

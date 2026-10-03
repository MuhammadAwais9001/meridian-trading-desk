import { createFileRoute } from "@tanstack/react-router";
import { DeskApp } from "@/components/desk/desk-app";
import { loadDesk } from "@/lib/desk";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await loadDesk({ data: { pairId: "BTC-USD", interval: "15m" } });
    } catch {
      return undefined;
    }
  },
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  return <DeskApp initial={initial} />;
}

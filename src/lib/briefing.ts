import { createServerFn } from "@tanstack/react-start";

export const requestBriefing = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const d = input as { snapshot?: string };
    if (!d?.snapshot || typeof d.snapshot !== "string") throw new Error("snapshot required");
    return { snapshot: d.snapshot.slice(0, 3500) };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Briefing is unavailable in this environment." };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 420,
        messages: [
          {
            role: "system",
            content:
              "You are a markets desk analyst for Meridian. Write a concise 2-paragraph briefing on the provided setup. Be precise, unsentimental, and never promise profits. End with one clear action: TAKE, REDUCE, or PASS. Educational only.",
          },
          { role: "user", content: data.snapshot },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `Desk briefing failed (${res.status}).` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "Empty briefing." };
    return { ok: true as const, text };
  });

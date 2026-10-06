type SummaryInput = {
  session: string;
  a: { name: string; lap: number; sectors: (number | null)[]; topSpeed: number | null; fullThrottle: number | null };
  b: { name: string; lap: number; sectors: (number | null)[]; topSpeed: number | null; fullThrottle: number | null };
};

function valid(input: unknown): input is SummaryInput {
  if (!input || typeof input !== "object") return false;
  const x = input as Record<string, unknown>;
  if (typeof x.session !== "string" || x.session.length > 100) return false;
  return [x.a, x.b].every(value => {
    if (!value || typeof value !== "object") return false;
    const side = value as Record<string, unknown>;
    return typeof side.name === "string" && side.name.length <= 80 && typeof side.lap === "number" && side.lap > 0 && side.lap < 400 && Array.isArray(side.sectors) && side.sectors.length === 3 && side.sectors.every(n => n === null || typeof n === "number" && n >= 0 && n < 200) && (side.topSpeed === null || typeof side.topSpeed === "number" && side.topSpeed >= 0 && side.topSpeed < 500) && (side.fullThrottle === null || typeof side.fullThrottle === "number" && side.fullThrottle >= 0 && side.fullThrottle <= 100);
  });
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ available: false });
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!valid(input)) return Response.json({ error: "Invalid telemetry summary" }, { status: 400 });
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini",
        store: false,
        max_output_tokens: 180,
        instructions: "You are a precise Formula 1 telemetry analyst. Write exactly 2 or 3 short sentences in plain English comparing the two selected laps. Use only the supplied measurements. Mention the lap time delta and one significant sector or telemetry difference. Do not claim a driving technique, corner behavior, tyre effect, strategy, or cause that cannot be established from these measurements. No title, bullets, markdown, hype, or invented facts.",
        input: JSON.stringify(input),
      }),
    });
    if (!response.ok) return Response.json({ available: false });
    const data = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = data.output?.flatMap(item => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text ?? "").join(" ").trim();
    if (!text) return Response.json({ available: false });
    return Response.json({ available: true, text });
  } catch { return Response.json({ available: false }); }
}

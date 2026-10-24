const endpoints = new Set(["sessions", "drivers", "laps", "car_data"]);
const keys = new Set(["year", "session_key", "driver_number", "date>", "date<"]);
const cache = new Map<string, { expires: number; data: unknown }>();
const pending = new Map<string, Promise<unknown>>();
export async function GET(request: Request, { params }: { params: Promise<{ endpoint: string }> }) {
  const { endpoint } = await params;
  if (!endpoints.has(endpoint)) return Response.json({ error: "Unknown endpoint" }, { status: 404 });
  const input = new URL(request.url);
  if ([...input.searchParams.keys()].some(k => !keys.has(k)) || input.search.length > 500) return Response.json({ error: "Invalid query" }, { status: 400 });
  if (endpoint === "car_data" && (!["session_key", "driver_number", "date>", "date<"].every(k => input.searchParams.has(k)) || !Number.isFinite(Date.parse(input.searchParams.get("date>")!)) || !Number.isFinite(Date.parse(input.searchParams.get("date<")!)) || Date.parse(input.searchParams.get("date<")!) - Date.parse(input.searchParams.get("date>")!) > 400000 || Date.parse(input.searchParams.get("date<")!) <= Date.parse(input.searchParams.get("date>")!))) return Response.json({ error: "A single lap window is required" }, { status: 400 });
  const url = `https://api.openf1.org/v1/${endpoint}${input.search}`;
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return Response.json(hit.data);
  try {
    let task = pending.get(url);
    if (!task) {
      task = (async () => {
        const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error(String(response.status));
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("502");
        if (cache.size >= 60) cache.delete(cache.keys().next().value!);
        cache.set(url, { expires: Date.now() + (endpoint === "sessions" ? 60000 : data.length ? 300000 : 30000), data });
        return data;
      })();
      pending.set(url, task);
    }
    return Response.json(await task);
  } catch (e) { const code = e instanceof Error ? Number(e.message) : 502; return Response.json({ error: "Telemetry source temporarily unavailable" }, { status: [401,403,429].includes(code) ? code : 502 }); }
  finally { pending.delete(url); }
}

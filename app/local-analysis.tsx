"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";

export function LocalAnalysis({ facts, context, ready }: { facts: string[]; context: string; ready: boolean }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null);
  const engine = useRef<WebWorkerMLCEngine | null>(null);
  const revision = useRef(0);
  const fingerprint = JSON.stringify({ facts, context });
  const cancel = () => { revision.current++; worker.current?.terminate(); worker.current = null; engine.current = null; setBusy(false); setStatus("Stopped. Measured insights remain available."); };
  useEffect(() => { revision.current++; setText(""); setStatus(""); setBusy(false); worker.current?.terminate(); worker.current = null; engine.current = null; }, [fingerprint]);
  useEffect(() => () => { revision.current++; worker.current?.terminate(); }, []);
  async function generate() {
    if (busy || !ready) return;
    if (!("gpu" in navigator)) { setStatus("Local AI requires WebGPU. Try current desktop Chrome or Edge. Measured insights work in every browser."); return; }
    const run = ++revision.current;
    setBusy(true); setText(""); setStatus("Preparing local AI…");
    try {
      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
      if (run !== revision.current) return;
      const { default: SummaryWorker } = await import("./summary.worker?worker");
      worker.current = new SummaryWorker();
      engine.current = await CreateWebWorkerMLCEngine(worker.current, "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", {
        initProgressCallback: p => { if (run === revision.current) setStatus(`Loading model · ${Math.round(p.progress * 100)}%`); }
      });
      if (run !== revision.current) return;
      setStatus("Writing your engineering brief…");
      const response = await engine.current.chat.completions.create({ temperature: 0, max_tokens: 60,
        response_format: { type: "json_object", schema: JSON.stringify({ type: "object", properties: { order: { type: "array", items: { type: "integer", enum: facts.map((_, i) => i) }, minItems: Math.min(3, facts.length), maxItems: Math.min(3, facts.length) } }, required: ["order"], additionalProperties: false }) },
        messages: [
          { role: "system", content: "Select the three most useful measured facts for a technical motorsport comparison. Prioritize overall lap delta, sector gain, then peak speed. Return only JSON with an order array of distinct fact indexes. Never generate new facts." },
          { role: "user", content: JSON.stringify(facts.map((fact, index) => ({ index, fact }))) }
        ] });
      if (run !== revision.current) return;
      let order: number[] = [];
      try { const parsed = JSON.parse(response.choices[0]?.message.content || "{}"); if (Array.isArray(parsed.order) && parsed.order.length === Math.min(3, facts.length) && new Set(parsed.order).size === parsed.order.length && parsed.order.every((n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) < facts.length)) order = parsed.order; } catch { /* Never display unvalidated model prose. */ }
      if (!order.length) { setStatus("AI could not produce a valid brief. Use the measured insights below."); return; }
      setText(order.map(i => facts[i]).join(" ") + " Peak speed alone cannot establish a drag or setup advantage; fuel, tyres, tow and energy deployment are uncontrolled.");
      setStatus("AI-selected on your device · facts preserved verbatim");
    } catch (error) { console.warn("Local AI initialization failed", error); if (run === revision.current) setStatus("Local AI could not start. GPU memory, model download or browser support may be unavailable. Retry or use the measured insights below."); }
    finally { if (run === revision.current) { setBusy(false); worker.current?.terminate(); worker.current = null; engine.current = null; } }
  }
  return <div className="local-ai"><div className="ai-label"><Sparkles size={14} /> LOCAL AI <span>FREE / OPEN SOURCE</span></div>
    <p className="ai-explainer">An engineering brief, selected by AI on your device. Qwen 2.5 via WebLLM. First use downloads several hundred MB; a compatible GPU is required.</p>
    <div className="ai-actions"><button className="red-button" disabled={!ready || busy} onClick={generate}><Sparkles size={14} />{busy ? "Preparing brief…" : "Generate AI brief"}</button>{busy && <button className="cancel-ai" onClick={cancel} aria-label="Cancel AI generation"><X size={16} /></button>}</div>
    <p role="status" className="ai-status">{status}</p>{text && <div className="ai-output"><p>{text}</p><small>AI selects the emphasis; every measurement is preserved from the source facts.</small></div>}
  </div>;
}



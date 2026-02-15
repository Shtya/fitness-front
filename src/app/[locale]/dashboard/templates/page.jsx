"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TEMPLATE_LIST = [
  {
    id: "template-1",
    title: "Gym Coach — Full Landing",
    description: "Complete landing page for gym coaches (hero, features, pricing, testimonials, FAQ, CTA, footer).",
    // IMPORTANT: in real app, load from your templates folder via fetch route
    // For now, we'll embed a placeholder and tell you how to wire it.
    src: "/templates/template-1.html",
    tag: "Complete",
  },
  // add more templates later:
  // { id:"template-2", title:"...", src:"/templates/template-2.html" }
];

const THEMES = [
  {
    id: "Ocean",
    vars: {
      "--bg": "#070a12",
      "--card": "rgba(255,255,255,0.06)",
      "--text": "#e5e7eb",
      "--muted": "rgba(229,231,235,0.78)",
      "--border": "rgba(255,255,255,0.12)",
      "--primary": "#60a5fa",
      "--primaryText": "#071018",
      "--accent": "#22c55e",
      "--accentText": "#052e16",
      "--ring": "rgba(96,165,250,0.45)",
    },
  },
  {
    id: "Sunset",
    vars: {
      "--bg": "#0b0612",
      "--card": "rgba(255,255,255,0.06)",
      "--text": "#f5f3ff",
      "--muted": "rgba(245,243,255,0.78)",
      "--border": "rgba(255,255,255,0.14)",
      "--primary": "#fb7185",
      "--primaryText": "#1b0b12",
      "--accent": "#f59e0b",
      "--accentText": "#2a1602",
      "--ring": "rgba(251,113,133,0.45)",
    },
  },
  {
    id: "Royal",
    vars: {
      "--bg": "#050716",
      "--card": "rgba(255,255,255,0.06)",
      "--text": "#e5e7eb",
      "--muted": "rgba(229,231,235,0.78)",
      "--border": "rgba(255,255,255,0.12)",
      "--primary": "#a78bfa",
      "--primaryText": "#0b0620",
      "--accent": "#22c55e",
      "--accentText": "#052e16",
      "--ring": "rgba(167,139,250,0.45)",
    },
  },
  {
    id: "Mono",
    vars: {
      "--bg": "#070707",
      "--card": "rgba(255,255,255,0.05)",
      "--text": "#f1f5f9",
      "--muted": "rgba(241,245,249,0.75)",
      "--border": "rgba(255,255,255,0.12)",
      "--primary": "#e2e8f0",
      "--primaryText": "#0b0b0b",
      "--accent": "#94a3b8",
      "--accentText": "#0b0b0b",
      "--ring": "rgba(226,232,240,0.40)",
    },
  },
];

// Helper: fetch html file content (from /public/templates for example)
async function fetchHtml(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load template: " + url);
  return await res.text();
}

export default function TemplatesPage() {
  const iframeRef = useRef(null);

  const [step, setStep] = useState(1); // 1 templates, 2 themes, 3 preview/publish
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [srcDoc, setSrcDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canGoThemes = !!selectedTemplate;
  const canGoPreview = !!selectedTemplate && !!selectedTheme;

  // Load selected template HTML into iframe srcDoc
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!selectedTemplate) return;
      setLoading(true);
      setError("");
      try {
        const html = await fetchHtml(selectedTemplate.src);
        if (!alive) return;
        setSrcDoc(html);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load template");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [selectedTemplate]);

  // Apply theme to iframe after it loads
  useEffect(() => {
    if (!iframeRef.current) return;
    if (!selectedTheme) return;

    const t = selectedTheme.vars;

    // send theme via postMessage (template listens to APPLY_THEME)
    const send = () => {
      try {
        iframeRef.current.contentWindow?.postMessage(
          { type: "APPLY_THEME", theme: t },
          "*"
        );
      } catch (e) {}
    };

    // try immediately + after small delay (in case iframe not ready)
    send();
    const id = setTimeout(send, 150);

    return () => clearTimeout(id);
  }, [selectedTheme, srcDoc]);

  async function publish() {
    setError("");
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) throw new Error("Preview not ready");

      // Get full HTML after edits + theme
      const html = "<!doctype html>\n" + doc.documentElement.outerHTML;

      // TODO: send to your API to save/publish per domain/subdomain
      // await fetch("/api/publish", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ templateId: selectedTemplate.id, themeId: selectedTheme.id, html }) })

      console.log("PUBLISH HTML size:", html.length);
      alert("Publish ready ✅ (check console). Now connect this to your /api/publish");
    } catch (e) {
      setError(e?.message || "Publish failed");
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background">
      <div className="container !py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Landing Templates</h1>
            <p className="text-muted-foreground mt-1">
              Choose a template → choose a theme → edit content → publish.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">Step {step}/3</Badge>
            <Button
              variant={step === 1 ? "default" : "outline"}
              onClick={() => setStep(1)}
            >
              Templates
            </Button>
            <Button
              variant={step === 2 ? "default" : "outline"}
              onClick={() => canGoThemes && setStep(2)}
              disabled={!canGoThemes}
            >
              Themes
            </Button>
            <Button
              variant={step === 3 ? "default" : "outline"}
              onClick={() => canGoPreview && setStep(3)}
              disabled={!canGoPreview}
            >
              Preview
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border p-4 text-sm text-red-500">
            {error}
          </div>
        ) : null}

        {/* STEP 1: Templates */}
        {step === 1 ? (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATE_LIST.map((t) => {
              const active = selectedTemplate?.id === t.id;
              return (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition ${
                    active ? "ring-2 ring-primary" : "hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedTemplate(t)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{t.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {t.description}
                        </div>
                      </div>
                      <Badge>{t.tag}</Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(t);
                          setStep(2);
                        }}
                      >
                        Choose
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(t);
                          setStep(3);
                        }}
                      >
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}

        {/* STEP 2: Themes */}
        {step === 2 ? (
          <div className="mt-8 grid lg:grid-cols-[360px_1fr] gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="font-semibold">Choose Theme</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Applies instantly to the selected template.
                </div>

                <div className="mt-4 space-y-2">
                  {THEMES.map((th) => {
                    const active = selectedTheme?.id === th.id;
                    return (
                      <button
                        key={th.id}
                        onClick={() => setSelectedTheme(th)}
                        className={`w-full text-left rounded-lg border px-4 py-3 transition ${
                          active ? "border-primary" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">{th.id}</div>
                          <div className="flex items-center gap-1">
                            <span
                              className="h-4 w-4 rounded-full border"
                              style={{ background: th.vars["--primary"] }}
                            />
                            <span
                              className="h-4 w-4 rounded-full border"
                              style={{ background: th.vars["--accent"] }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Primary + Accent palette
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    className="w-full"
                    disabled={!canGoPreview}
                    onClick={() => setStep(3)}
                  >
                    Next: Preview
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b px-4 py-3 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-semibold">Template:</span>{" "}
                    {selectedTemplate?.title || "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Theme: <span className="font-semibold">{selectedTheme?.id}</span>
                  </div>
                </div>

                <div className="p-0">
                  {loading ? (
                    <div className="p-6 text-sm text-muted-foreground">
                      Loading template…
                    </div>
                  ) : (
                    <iframe
                      ref={iframeRef}
                      title="Template Preview"
                      className="w-full"
                      style={{ height: "70vh", background: "transparent" }}
                      srcDoc={srcDoc || "<html><body style='font-family: Arial'>Select a template</body></html>"}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* STEP 3: Preview + Publish */}
        {step === 3 ? (
          <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-4">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm">
                    <span className="font-semibold">Editing inside preview:</span>{" "}
                    click any text to edit.
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Template: <span className="font-semibold">{selectedTemplate?.id}</span> • Theme:{" "}
                    <span className="font-semibold">{selectedTheme?.id}</span>
                  </div>
                </div>

                <iframe
                  ref={iframeRef}
                  title="Final Preview"
                  className="w-full"
                  style={{ height: "78vh", background: "transparent" }}
                  srcDoc={srcDoc || "<html><body style='font-family: Arial'>Select a template</body></html>"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="font-semibold">Publish</div>
                <div className="text-sm text-muted-foreground">
                  This will take the final HTML (with edits + theme) and send it to your backend.
                </div>

                <div className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template</span>
                    <span className="font-semibold">{selectedTemplate?.title || "—"}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Theme</span>
                    <span className="font-semibold">{selectedTheme?.id || "—"}</span>
                  </div>
                </div>

                <Button onClick={publish} className="w-full">
                  Publish Landing Page
                </Button>

                <Button variant="outline" onClick={() => setStep(2)} className="w-full">
                  Back to Themes
                </Button>

                <div className="text-xs text-muted-foreground">
                  Tip: connect <code>/api/publish</code> to store HTML per domain/subdomain.
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

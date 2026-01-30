"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_MOCK = {
  welcome: {
    title: "Bienvenue chez Steel & Blade",
    subtitle: "Que puis-je faire pour vous aujourd'hui ?",
    image_url:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
  },
  services: [
    { id: 1, name: "Coupe classique", price: 25 },
    { id: 2, name: "Taille de barbe", price: 15 },
    { id: 3, name: "Rasage traditionnel", price: 20 },
  ],
  locations: [
    {
      id: "loc-1",
      name: "Centre Montreux",
      address: "Rue Example 12",
      image_url:
        "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?q=80&w=1200&auto=format&fit=crop",
    },
    {
      id: "loc-2",
      name: "Centre Lausanne",
      address: "Avenue Sample 9",
      image_url:
        "https://images.unsplash.com/photo-1521498542256-5b54b5c4b4b0?q=80&w=1200&auto=format&fit=crop",
    },
  ],
  stylists: [
    { id: "sty-1", name: "Nicolas" },
    { id: "sty-2", name: "Karim" },
  ],
  slots: ["10:00", "10:30", "11:00"],
};

export default function ChatGPTPreviewPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState("Chargement du widget...");
  const [dataStatus, setDataStatus] = useState("Donnees mock.");
  const [mockData, setMockData] = useState(DEFAULT_MOCK);

  const callToolMock = useCallback(
    async (name: string) => {
      if (name === "list_services") {
        return { structuredContent: { services: mockData.services } };
      }
      if (name === "list_locations") {
        return { structuredContent: { locations: mockData.locations } };
      }
      if (name === "list_stylists") {
        return { structuredContent: { stylists: mockData.stylists } };
      }
      if (name === "get_availability") {
        return { structuredContent: { slots: mockData.slots } };
      }
      if (name === "get_welcome") {
        return { structuredContent: { welcome: mockData.welcome } };
      }
      return { structuredContent: {} };
    },
    [mockData]
  );

  const injectMock = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return false;

    const frameWindow = iframe.contentWindow as Window & {
      openai?: {
        toolOutput?: typeof DEFAULT_MOCK;
        callTool?: (name: string, payload?: Record<string, unknown>) => Promise<{
          structuredContent?: Record<string, unknown>;
        }>;
      };
    };

    frameWindow.openai = {
      toolOutput: mockData,
      callTool: async (name: string) => callToolMock(name),
    };

    frameWindow.dispatchEvent(
      new CustomEvent("openai:set_globals", {
        detail: { globals: { toolOutput: mockData } },
      })
    );

    return true;
  }, [callToolMock, mockData]);

  const loadRealLocations = useCallback(async () => {
    try {
      const response = await fetch("/api/chatgpt-preview/locations", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("bad response");
      }
      const payload = await response.json();
      if (payload?.locations?.length) {
        setMockData((prev) => ({ ...prev, locations: payload.locations }));
        setDataStatus("Centres reels charges.");
      } else {
        setDataStatus("Centres reels indisponibles.");
      }
    } catch {
      setDataStatus("Centres reels indisponibles.");
    }
  }, []);

  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (injectMock()) {
        setStatus("Widget charge avec donnees mock.");
        window.clearInterval(timer);
      } else if (attempts > 20) {
        setStatus("Impossible de charger le widget.");
        window.clearInterval(timer);
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, [injectMock]);

  useEffect(() => {
    void loadRealLocations();
  }, [loadRealLocations]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: "#0f0f0f",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "20px" }}>
            Previsualisation du widget ChatGPT
          </h1>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "13px" }}>
            Cette page injecte des donnees mock dans le widget.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const ok = injectMock();
            setStatus(ok ? "Widget actualise." : "Echec de l'actualisation.");
          }}
          style={{
            padding: "10px 16px",
            background: "#c8981d",
            color: "#111",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Recharger les donnees
        </button>
      </header>

      <div style={{ color: "#bbb", fontSize: "12px" }}>
        {status} {dataStatus}
      </div>

      <div
        style={{
          background: "#1a1a1a",
          borderRadius: "16px",
          padding: "16px",
          flex: 1,
        }}
      >
        <iframe
          ref={iframeRef}
          title="ChatGPT widget"
          src="/chatgpt-reserva-widget.html"
          style={{
            width: "100%",
            height: "100%",
            minHeight: "720px",
            border: "none",
            borderRadius: "12px",
            background: "#fff",
          }}
        />
      </div>
    </div>
  );
}

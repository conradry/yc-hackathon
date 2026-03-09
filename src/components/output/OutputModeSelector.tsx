"use client";

import { useState } from "react";
import { DownloadMode } from "./DownloadMode";
import { EndpointMode } from "./EndpointMode";
import { ContinueMode } from "./ContinueMode";

type Mode = "download" | "endpoint" | "continue";

interface OutputModeSelectorProps {
  result: {
    dataset_name: string;
    dataset_uid: string;
    summary: {
      cells: number;
      genes: number;
      perturbations: string[];
      steps: string[];
    };
    download: {
      data_path: string;
      data_format: string;
      data_size_mb: number;
      skill_path: string;
    };
    api_endpoint: {
      function_name: string;
      description: string;
      arguments: {
        name: string;
        type: string;
        default?: string;
        description: string;
      }[];
      example_response: string;
    };
    analyses: {
      id: string;
      title: string;
      description: string;
      requirements_met: boolean;
      requirements_note?: string;
      prompt: string;
    }[];
  };
}

const TABS: { key: Mode; icon: string; label: string; sublabel: string }[] = [
  { key: "download", icon: "↓", label: "Download", sublabel: "Get data + skill files" },
  { key: "endpoint", icon: "{}", label: "API Endpoint", sublabel: "Function spec & examples" },
  { key: "continue", icon: "→", label: "Continue Analysis", sublabel: "Run follow-up analyses" },
];

export function OutputModeSelector({ result }: OutputModeSelectorProps) {
  const [mode, setMode] = useState<Mode>("download");

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      {/* Dataset summary banner */}
      <div className="neo-border neo-shadow bg-white rounded-sm p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-bold text-base">{result.dataset_name}</h3>
          <span className="text-xs bg-[var(--color-secondary)] px-2 py-0.5 rounded-sm font-mono">
            {result.summary.cells.toLocaleString()} cells × {result.summary.genes.toLocaleString()} genes
          </span>
        </div>
        {result.summary.perturbations.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {result.summary.perturbations.map((p) => (
              <span
                key={p}
                className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-sm font-semibold"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 neo-border rounded-sm px-3 py-2.5 text-left transition-all ${
              mode === tab.key
                ? "bg-[var(--color-primary)] text-white neo-shadow-sm"
                : "bg-white hover:bg-[var(--color-secondary)]"
            }`}
          >
            <span className="font-mono text-sm mr-1.5">{tab.icon}</span>
            <span className="font-semibold text-sm">{tab.label}</span>
            <p
              className={`text-xs mt-0.5 ${
                mode === tab.key ? "text-white/70" : "text-[var(--color-muted)]"
              }`}
            >
              {tab.sublabel}
            </p>
          </button>
        ))}
      </div>

      {/* Active mode content */}
      {mode === "download" && (
        <DownloadMode
          download={result.download}
          datasetName={result.dataset_name}
          onSwitchMode={() => setMode("continue")}
        />
      )}
      {mode === "endpoint" && (
        <EndpointMode
          endpoint={result.api_endpoint}
          datasetName={result.dataset_name}
        />
      )}
      {mode === "continue" && <ContinueMode analyses={result.analyses} />}
    </div>
  );
}

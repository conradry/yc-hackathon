"use client";

import { useState } from "react";

interface DownloadModeProps {
  download: {
    data_path: string;
    data_format: string;
    data_size_mb: number;
    skill_path: string;
  };
  datasetName: string;
  onSwitchMode: (mode: "continue") => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="neo-btn bg-[var(--color-secondary)] px-3 py-1.5 rounded-sm text-xs font-semibold"
    >
      {copied ? "Copied!" : "Copy Path"}
    </button>
  );
}

export function DownloadMode({ download, onSwitchMode }: DownloadModeProps) {
  const fileName = download.data_path.split("/").pop() || download.data_path;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data file card */}
        <div className="neo-border neo-shadow-sm bg-white rounded-sm p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{fileName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-sm font-semibold uppercase">
                  {download.data_format}
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  {download.data_size_mb} MB
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-2 font-mono truncate">
                {download.data_path}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <CopyButton text={download.data_path} />
          </div>
        </div>

        {/* Skill file card */}
        <div className="neo-border neo-shadow-sm bg-white rounded-sm p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">SKILL.md</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Dataset skill for future Claude Code sessions
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-2 font-mono truncate">
                {download.skill_path}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <CopyButton text={download.skill_path} />
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--color-muted)] italic">
        Dataset skill created for future sessions
      </p>

      <button
        onClick={() => onSwitchMode("continue")}
        className="text-sm text-[var(--color-primary)] font-semibold hover:underline"
      >
        Continue Analysis →
      </button>
    </div>
  );
}

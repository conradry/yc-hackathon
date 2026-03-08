"use client";

interface ResultsPanelProps {
  title: string;
  children: React.ReactNode;
}

export function ResultsPanel({ title, children }: ResultsPanelProps) {
  return (
    <div className="neo-border neo-shadow rounded-sm overflow-hidden">
      <div className="px-4 py-2 bg-black text-white">
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

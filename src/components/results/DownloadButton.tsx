"use client";

interface DownloadButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
}

export function DownloadButton({
  data,
  filename,
  label = "Download CSV",
}: DownloadButtonProps) {
  const handleDownload = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const str = String(val ?? "");
            return str.includes(",") || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="neo-btn bg-[var(--color-secondary)] px-4 py-2 rounded-sm text-xs font-semibold"
    >
      {label}
    </button>
  );
}

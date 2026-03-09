"use client";

import { useState } from "react";

interface EndpointModeProps {
  endpoint: {
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
  datasetName: string;
}

export function EndpointMode({ endpoint, datasetName }: EndpointModeProps) {
  const [showExample, setShowExample] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const curlCommand = `curl -X POST /api/${endpoint.function_name} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(
    Object.fromEntries(
      endpoint.arguments.map((a) => [a.name, a.default || `<${a.type}>`])
    )
  )}'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  let formattedExample = endpoint.example_response;
  try {
    formattedExample = JSON.stringify(JSON.parse(endpoint.example_response), null, 2);
  } catch {
    // keep as-is
  }

  return (
    <div className="neo-border rounded-sm overflow-hidden">
      {/* Dark header */}
      <div className="bg-[#0d1117] px-4 py-3 flex items-center gap-3">
        <span className="font-mono text-sm text-[#58a6ff] bg-[#161b22] px-2.5 py-1 rounded-md border border-[#30363d]">
          {endpoint.function_name}
        </span>
        <span className="text-xs text-[#8b949e]">{datasetName}</span>
      </div>

      {/* Description */}
      <div className="bg-[#0d1117] px-4 pb-3 border-b border-[#30363d]">
        <p className="text-sm text-[#c9d1d9]">{endpoint.description}</p>
      </div>

      {/* Arguments table */}
      <div className="bg-[#0d1117]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363d] text-[#8b949e] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-2 font-semibold">Name</th>
              <th className="text-left px-4 py-2 font-semibold">Type</th>
              <th className="text-left px-4 py-2 font-semibold">Default</th>
              <th className="text-left px-4 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoint.arguments.map((arg) => (
              <tr key={arg.name} className="border-b border-[#21262d]">
                <td className="px-4 py-2 font-mono text-[#58a6ff] text-xs">{arg.name}</td>
                <td className="px-4 py-2 text-[#8b949e] text-xs">{arg.type}</td>
                <td className="px-4 py-2 text-[#8b949e] text-xs font-mono">
                  {arg.default || "—"}
                </td>
                <td className="px-4 py-2 text-[#c9d1d9] text-xs">{arg.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Example response (collapsible) */}
      {showExample && (
        <div className="bg-[#161b22] border-t border-[#30363d]">
          <pre className="px-4 py-3 text-xs text-[#c9d1d9] overflow-x-auto whitespace-pre-wrap font-mono">
            {formattedExample}
          </pre>
        </div>
      )}

      {/* Action bar */}
      <div className="bg-[#0d1117] px-4 py-3 flex items-center gap-3 border-t border-[#30363d]">
        <button
          onClick={() => setShowExample(!showExample)}
          className="px-3 py-1.5 bg-[#238636] text-white text-xs font-semibold rounded-md border border-[#2ea043] hover:bg-[#2ea043] transition-colors"
        >
          {showExample ? "Hide Example" : "Try it"}
        </button>
        <button
          onClick={handleCopyCurl}
          className="px-3 py-1.5 bg-[#21262d] text-[#c9d1d9] text-xs font-semibold rounded-md border border-[#30363d] hover:bg-[#30363d] transition-colors"
        >
          {copiedCurl ? "Copied!" : "Copy cURL"}
        </button>
      </div>
    </div>
  );
}

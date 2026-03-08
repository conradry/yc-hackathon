import { ToolLoopAgent, createAgentUIStreamResponse, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { allTools } from "@/lib/ai/tools";

const orchestrator = new ToolLoopAgent({
  id: "perturbation-orchestrator",
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: ORCHESTRATOR_SYSTEM_PROMPT,
  tools: allTools,
  stopWhen: stepCountIs(15),
});

export async function POST(req: Request) {
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid 'messages' array" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    return createAgentUIStreamResponse({
      agent: orchestrator,
      uiMessages: body.messages,
      onError: (error) => {
        console.error("[chat/route] Streaming error:", error);
        return String(error);
      },
    });
  } catch (error) {
    console.error("[chat/route] Failed to create stream:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

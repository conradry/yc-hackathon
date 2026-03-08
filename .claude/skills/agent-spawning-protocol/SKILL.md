# Agent Spawning Protocol

## Purpose
Defines how Claude Code spawns, manages, and collects results from subagents in the perturbation biology pipeline. This is the core orchestration primitive — all multi-agent workflows use this protocol.

## When to Use
Invoke this protocol whenever a workflow requires parallel or sequential agent execution. The `concurrent-assessment-workflow` and other multi-agent skills depend on this.

## Spawning Protocol

### 1. Context Template
Every spawned agent receives a **context envelope** with these fields:

```json
{
  "agent_id": "<workflow>-agent-<N>",
  "role": "<assessor|preprocessor|router|generator>",
  "task_description": "<specific task for this agent>",
  "input_data": {
    "query": "<structured query object from query-understanding>",
    "papers": "<candidate papers list, if applicable>",
    "dataset_path": "<path to h5ad file, if applicable>",
    "rubric": "<quality rubric reference, if applicable>"
  },
  "output_schema": "<expected JSON output schema>",
  "constraints": {
    "max_turns": 25,
    "timeout_seconds": 300,
    "allowed_tools": ["Read", "Grep", "Glob", "Bash", "Write"]
  }
}
```

### 2. Agent Naming Convention
- Format: `{workflow}-agent-{N}` where N is 1-indexed
- Examples: `assessment-agent-1`, `preprocessing-agent-1`
- Each agent gets a unique ID within its workflow run

### 3. Spawning via Claude Code Agent Tool
Use the `Agent` tool with `subagent_type: "general-purpose"` for each agent:

```
Agent(
  description: "<3-5 word task summary>",
  prompt: "<full context envelope as described above>",
  subagent_type: "general-purpose"
)
```

**Parallel spawning**: When agents are independent (e.g., concurrent assessors), spawn all in a single message with multiple Agent tool calls.

**Sequential spawning**: When agents depend on prior results, spawn one at a time and pass results forward.

### 4. Result Collection Format
Each agent must return a structured JSON result:

```json
{
  "agent_id": "<agent_id from context>",
  "status": "success | error | timeout",
  "result": {
    "<workflow-specific fields>"
  },
  "metadata": {
    "turns_used": "<number>",
    "tools_called": ["<tool names>"],
    "confidence": "<0.0-1.0>"
  }
}
```

### 5. Error and Timeout Handling
- **Agent error**: Log the error, continue with remaining agents. Note which agent failed in the final report.
- **Agent timeout**: If an agent exceeds `max_turns`, treat its partial result as low-confidence. Flag it in metadata.
- **All agents fail**: Return an error report to the user explaining what went wrong. Do not silently fail.
- **Retry policy**: Do not auto-retry. Surface failures to the orchestrating workflow for decision.

### 6. Result Merging
The orchestrating workflow (not this protocol) handles merging. This protocol only defines:
- All results are collected into a list
- Each result is tagged with its `agent_id`
- The orchestrator applies workflow-specific merging logic (e.g., consensus scoring, majority vote)

## Constraints
- Maximum 5 concurrent agents per workflow run (to stay within resource limits)
- Each agent should be self-contained — no inter-agent communication
- Agents must not spawn sub-agents (single level of nesting only)
- All agent output must be structured JSON, never free-form text

## Dependencies
- Used by: `concurrent-assessment-workflow`, `dataset-preprocessing-workflow`, `output-routing-workflow`
- Uses: None (this is a foundational protocol)

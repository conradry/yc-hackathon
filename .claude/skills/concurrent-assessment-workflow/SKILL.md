# Concurrent Assessment Workflow

## Purpose
Spawns N independent agents to assess the same set of candidate papers using the quality rubric. Produces a consensus ranking with divergence analysis. This is the core evaluation mechanism of the pipeline.

## When to Use
Invoke after `paper-search-workflow` returns a candidate list. This workflow produces the final quality-assessed ranking that feeds into downstream analysis.

## Workflow Steps

### Step 1: Configure Assessment Run
Determine assessment parameters:

- **Number of agents (N)**: Default 3. Use 5 for high-stakes assessments. Minimum 2.
- **Papers per agent**: All agents assess the same papers (full overlap for consensus)
- **Max papers**: Cap at 10 papers per run. If more candidates, pre-filter to top 10 by initial ranking.

### Step 2: Prepare Agent Context
For each agent, build a context envelope following `agent-spawning-protocol`:

```json
{
  "agent_id": "assessment-agent-<N>",
  "role": "assessor",
  "task_description": "Independently assess the following papers using the quality rubric. Score each paper on 6 dimensions (1-5 scale). Return structured JSON assessment for each paper including the confounders_identified list. Do NOT coordinate with other agents — your assessment must be independent. You MUST perform active methods research (see below).",
  "input_data": {
    "papers": "<candidate papers from paper-search-workflow>",
    "rubric": "<full quality-rubric SKILL.md content>",
    "query_context": "<original structured query for relevance assessment>"
  },
  "output_schema": "<assessment output format from quality-rubric>",
  "allowed_tools": ["WebSearch", "WebFetch"],
  "active_research_mandate": true
}
```

### Step 2.5: Active Methods Research (Per-Agent Instruction)

Each assessment agent must perform the following research steps **for every paper** before scoring the Analytical Methods & Instrumentation dimension:

1. **Extract methods metadata** from the paper:
   - Sequencing platform and version (e.g., 10x Chromium v3, Smart-seq2)
   - Library preparation chemistry (e.g., poly-dT capture, UMI-based)
   - Computational pipeline (e.g., Cell Ranger 7.0, STARsolo)
   - Normalization/batch correction methods (e.g., sctransform, Harmony)
   - Statistical/DE methods (e.g., Wilcoxon rank-sum, MAST, pseudobulk DESeq2)

2. **Use WebSearch to research known caveats** for each identified method:
   - Search for: `"<method name> known limitations scRNA-seq"` or `"<platform> biases single-cell"`
   - Look for: dropout rates, ambient RNA contamination levels, doublet rates at reported loading densities, gene-length biases, 3' coverage bias, index hopping rates
   - Check: has the method been superseded or flagged in benchmarking studies?

3. **Cross-reference** findings against the paper:
   - Does the paper acknowledge the platform's known limitations?
   - Were mitigation steps taken (e.g., SoupX/CellBender for ambient RNA, scrublet/DoubletFinder for doublets)?
   - Are the statistical methods appropriate for the sample size and data structure?

4. **Populate the output**:
   - Score the `analytical_methods` dimension (1-5) based on the rubric
   - Fill the `confounders_identified` array with each discovered caveat, noting whether the paper acknowledged and mitigated it
   - Factor unmitigated confounders into the overall `caveats` and `weaknesses` fields

**Important**: The goal is NOT to penalize papers for using standard methods, but to surface hidden confounders that could affect interpretation. A paper using 10x Chromium v2 can still score 5/5 if it acknowledges 3' bias and demonstrates it doesn't affect the perturbation signature.

### Step 3: Spawn Agents in Parallel
Use `agent-spawning-protocol` to spawn all N agents simultaneously:

```
# Spawn all agents in a single message (parallel execution)
Agent(description: "Assess papers batch 1", prompt: "<context for agent-1>", subagent_type: "general-purpose")
Agent(description: "Assess papers batch 2", prompt: "<context for agent-2>", subagent_type: "general-purpose")
Agent(description: "Assess papers batch 3", prompt: "<context for agent-3>", subagent_type: "general-purpose")
```

### Step 4: Collect Results
Wait for all agents to complete. Parse each agent's JSON output.

Handle edge cases:
- If an agent returns malformed JSON, attempt to extract scores from text
- If an agent fails entirely, proceed with N-1 assessments (minimum 2 required)
- If fewer than 2 agents succeed, report failure

### Step 5: Compute Consensus
For each paper, across all agents:

**Consensus Score:**
```
consensus_composite = mean(agent_composite_scores)
```

**Per-Dimension Consensus:**
```
consensus_dimension_i = mean(agent_scores_dimension_i)
std_dimension_i = std(agent_scores_dimension_i)
```

**Agreement Classification:**
- **Strong agreement**: std < 0.5 across all dimensions
- **Moderate agreement**: std < 1.0 across all dimensions
- **Divergent**: std ≥ 1.0 on any dimension → flag for review

### Step 6: Divergence Analysis
For papers with divergent scores:
- Identify which dimension(s) caused divergence
- Extract each agent's reasoning for that dimension
- Produce a divergence report highlighting the disagreement
- Suggest: "Manual review recommended for [paper] — agents disagree on [dimension]"

### Step 7: Produce Final Output

```json
{
  "assessment_run": {
    "num_agents": 3,
    "num_papers_assessed": 8,
    "agents_succeeded": 3,
    "agents_failed": 0
  },
  "consensus_ranking": [
    {
      "rank": 1,
      "paper_id": "<DOI>",
      "title": "<title>",
      "consensus_score": 4.2,
      "score_breakdown": {
        "experimental_design": {"mean": 4.3, "std": 0.3},
        "data_quality": {"mean": 4.5, "std": 0.2},
        "perturbation_characterization": {"mean": 4.0, "std": 0.5},
        "reproducibility": {"mean": 3.8, "std": 0.4},
        "biological_relevance": {"mean": 4.2, "std": 0.3},
        "analytical_methods": {"mean": 3.5, "std": 0.5}
      },
      "agreement": "strong",
      "recommendation": "prioritize",
      "red_flags": [],
      "consensus_confounders": [
        {
          "source": "<platform|library_prep|pipeline|normalization|statistical_method>",
          "method": "<specific method/tool>",
          "caveat": "<known bias or limitation>",
          "agents_flagging": 3,
          "consensus_impact": "<none|minor|moderate|major>"
        }
      ],
      "consensus_strengths": ["<shared strengths>"],
      "consensus_weaknesses": ["<shared weaknesses>"]
    }
  ],
  "divergence_report": [
    {
      "paper_id": "<DOI>",
      "divergent_dimensions": ["reproducibility"],
      "agent_reasoning": {
        "assessment-agent-1": "<reasoning>",
        "assessment-agent-2": "<reasoning>",
        "assessment-agent-3": "<reasoning>"
      },
      "suggested_action": "Manual review recommended"
    }
  ],
  "telemetry": {
    "total_time_seconds": "<elapsed>",
    "per_agent_turns": {"agent-1": 12, "agent-2": 10, "agent-3": 14}
  }
}
```

### Step 8: Present to User
Summarize results in a readable format:
- Top-ranked papers with scores and key strengths
- Any papers flagged for divergence
- Recommendation for next steps (proceed to preprocessing, search more, etc.)

## Dependencies
- Uses: `agent-spawning-protocol` (spawning), `quality-rubric` (assessment criteria), `paper-search-workflow` (input), WebSearch & WebFetch (active methods research)
- Used by: `perturbation-type-router` (passes ranked papers for analysis routing)

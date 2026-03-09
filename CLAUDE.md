# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Info

- Python project, early stage — no dependencies or build system configured yet
- `tasks/` directory used for planning (`tasks/todo.md`) and capturing lessons (`tasks/lessons.md`)

## Workflow Orchestration

### Plan First
- Enter plan mode for any non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan — don't keep pushing
- Write detailed specs upfront to reduce ambiguity

### Subagent Strategy
- Use subagents to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules that prevent the same mistake recurring
- Review lessons at session start

### Verification Before Done
- Never mark a task complete without proving it works
- Run tests, check logs, demonstrate correctness

### Autonomous Bug Fixing
- When given a bug report: just fix it — point at logs/errors, then resolve them
- Zero context switching required from the user

### Git Commits
- Never use `Co-Authored-By: Claude` in commit messages — do not co-author commits
- Keep commit messages clean and human-authored

## Task Management

1. **Plan**: Write plan to `tasks/todo.md` with checkable items
2. **Track**: Mark items complete as you go, explain changes at each step
3. **Document**: Add review section to `tasks/todo.md` when done
4. **Learn**: Update `tasks/lessons.md` after corrections

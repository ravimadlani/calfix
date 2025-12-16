---
name: work
description: Execute work plans efficiently while maintaining quality and finishing features
argument-hint: "[plan file, specification, Notion page URL, or todo ID]"
---

# Work Plan Execution Command

Execute a work plan efficiently while maintaining quality and finishing features.

## Introduction

This command takes a work document (plan, specification, Notion page, or todo ID) and executes it systematically. The focus is on **shipping complete features** by understanding requirements quickly, following existing patterns, and maintaining quality throughout.

## Input Document

<input_document> #$ARGUMENTS </input_document>

## Execution Workflow

### Phase 1: Quick Start

1. **Read Plan and Clarify**

   **If Notion URL or Todo ID provided:**
   - Fetch the Notion page using `mcp__notion__notion-fetch`
   - Parse the Problem Statement, Proposed Solutions, and Acceptance Criteria
   - Review Technical Details and Resources

   **If file path provided:**
   - Read the work document completely
   - Review any references or links provided in the plan

   - If anything is unclear or ambiguous, ask clarifying questions now
   - Get user approval to proceed
   - **Do not skip this** - better to ask questions now than build the wrong thing

2. **Setup Environment**

   Choose your work style:

   **Option A: Live work on current branch**
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature-branch-name
   ```

   **Option B: Parallel work with worktree (recommended for parallel development)**
   ```bash
   # Ask user first: "Work in parallel with worktree or on current branch?"
   # If worktree:
   skill: git-worktree
   # The skill will create a new branch from main in an isolated worktree
   ```

   **Recommendation**: Use worktree if:
   - You want to work on multiple features simultaneously
   - You want to keep main clean while experimenting
   - You plan to switch between branches frequently

   Use live branch if:
   - You're working on a single feature
   - You prefer staying in the main repository

3. **Create Todo List**
   - Use TodoWrite to break plan into actionable tasks
   - Include dependencies between tasks
   - Prioritize based on what needs to be done first
   - Include testing and quality check tasks
   - Keep tasks specific and completable

### Phase 2: Execute

1. **Task Execution Loop**

   For each task in priority order:

   ```
   while (tasks remain):
     - Mark task as in_progress in TodoWrite
     - Read any referenced files from the plan
     - Look for similar patterns in codebase
     - Implement following existing conventions
     - Write tests for new functionality
     - Run tests after changes
     - Mark task as completed
   ```

2. **Follow Existing Patterns**

   - The plan should reference similar code - read those files first
   - Match naming conventions exactly
   - Reuse existing components where possible
   - Follow project coding standards (see CLAUDE.md)
   - When in doubt, grep for similar implementations

3. **Test Continuously**

   - Run relevant tests after each significant change
   - Don't wait until the end to test
   - Fix failures immediately
   - Add new tests for new functionality

4. **Figma Design Sync** (if applicable)

   For UI work with Figma designs:

   - Implement components following design specs
   - Use figma-design-sync agent iteratively to compare
   - Fix visual differences identified
   - Repeat until implementation matches design

5. **Track Progress**
   - Keep TodoWrite updated as you complete tasks
   - Note any blockers or unexpected discoveries
   - Create new tasks if scope expands
   - Keep user informed of major milestones

### Phase 3: Quality Check

1. **Run Core Quality Checks**

   Always run before submitting:

   ```bash
   # Run TypeScript checks
   npm run build

   # Run linting
   npm run lint
   ```

2. **Consider Reviewer Agents** (Optional)

   Use for complex, risky, or large changes:

   - **code-simplicity-reviewer**: Check for unnecessary complexity
   - **kieran-typescript-reviewer**: Verify TypeScript/React conventions
   - **performance-oracle**: Check for performance issues
   - **security-sentinel**: Scan for security vulnerabilities

   Run reviewers in parallel with Task tool:

   ```
   Task(code-simplicity-reviewer): "Review changes for simplicity"
   Task(kieran-typescript-reviewer): "Check TypeScript conventions"
   ```

   Present findings to user and address critical issues.

3. **Final Validation**
   - All TodoWrite tasks marked completed
   - All tests pass
   - Linting passes
   - Code follows existing patterns
   - Figma designs match (if applicable)
   - No console errors or warnings

### Phase 4: Ship It

1. **Create Commit**

   ```bash
   git add .
   git status  # Review what's being committed
   git diff --staged  # Check the changes

   # Commit with conventional format
   git commit -m "$(cat <<'EOF'
   feat(scope): description of what and why

   Brief explanation if needed.

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

2. **Capture Screenshots for UI Changes** (if applicable)

   For any design changes, new views, or UI modifications:

   ```bash
   # Start the dev server if not already running
   npm run dev  # Run in background
   ```

   Using Playwright MCP tools:
   - `browser_resize` to set mobile viewport (320x568 or similar)
   - `browser_navigate` to go to affected pages
   - `browser_snapshot` to check page state
   - `browser_take_screenshot` to capture images

3. **Create Pull Request**

   ```bash
   git push -u origin feature-branch-name

   gh pr create --title "Feature: [Description]" --body "$(cat <<'EOF'
   ## Summary
   - What was built
   - Why it was needed
   - Key decisions made

   ## Testing
   - Tests added/modified
   - Manual testing performed

   ## Before / After Screenshots
   | Before | After |
   |--------|-------|
   | ![before](URL) | ![after](URL) |

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

4. **Update Notion Todo Status**

   After work is complete, update the Notion page:

   ```
   mcp__notion__notion-update-page({
     "data": {
       "page_id": "{notion_page_id}",
       "command": "update_properties",
       "properties": {
         "Status": "Completed"
       }
     }
   })
   ```

   Also add to the Work Log in the page content:

   ```
   mcp__notion__notion-update-page({
     "data": {
       "page_id": "{notion_page_id}",
       "command": "insert_content_after",
       "selection_with_ellipsis": "## Work Log...Learnings:",
       "new_str": "\n\n### {date} - Implementation Complete\n**By:** Claude Code\n**Actions:**\n- Implemented fix\n- Added tests\n- Created PR #{pr_number}\n\n**Learnings:**\n- {key_learnings}"
     }
   })
   ```

5. **Notify User**
   - Summarize what was completed
   - Link to PR
   - Link to updated Notion page
   - Note any follow-up work needed
   - Suggest next steps if applicable

---

## Working with Notion Todos

### Fetching a Notion Todo

```
mcp__notion__notion-fetch({ "id": "{notion_url_or_id}" })
```

This returns the page with:
- Problem Statement
- Findings with code snippets
- Proposed Solutions with pros/cons
- Acceptance Criteria (use as checklist)
- Work Log (update as you work)

### Finding Todos by ID Pattern

Search for todos by their ID pattern:

```
mcp__notion__notion-search({
  "query": "[P1-035]",
  "query_type": "internal"
})
```

### Updating Todo Status

Statuses available:
- `Backlog` - New findings, not yet started
- `Planned` - Approved, scheduled for work
- `In progress` - Currently being worked on
- `Completed` - Work finished
- `On Hold` - Blocked or paused
- `Cancelled` - Will not be done

---

## Key Principles

### Start Fast, Execute Faster

- Get clarification once at the start, then execute
- Don't wait for perfect understanding - ask questions and move
- The goal is to **finish the feature**, not create perfect process

### The Plan is Your Guide

- Work documents should reference similar code and patterns
- Load those references and follow them
- Don't reinvent - match what exists

### Test As You Go

- Run tests after each change, not at the end
- Fix failures immediately
- Continuous testing prevents big surprises

### Quality is Built In

- Follow existing patterns
- Write tests for new code
- Run linting before pushing
- Use reviewer agents for complex/risky changes only

### Ship Complete Features

- Mark all tasks completed before moving on
- Don't leave features 80% done
- A finished feature that ships beats a perfect feature that doesn't
- Update Notion status when complete

## Quality Checklist

Before creating PR, verify:

- [ ] All clarifying questions asked and answered
- [ ] All TodoWrite tasks marked completed
- [ ] Build passes (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code follows existing patterns
- [ ] Figma designs match implementation (if applicable)
- [ ] Before/after screenshots captured (for UI changes)
- [ ] Commit messages follow conventional format
- [ ] PR description includes summary and testing notes
- [ ] Notion todo status updated to "Completed"

## When to Use Reviewer Agents

**Don't use by default.** Use reviewer agents only when:

- Large refactor affecting many files (10+)
- Security-sensitive changes (authentication, permissions, data access)
- Performance-critical code paths
- Complex algorithms or business logic
- User explicitly requests thorough review

For most features: tests + linting + following patterns is sufficient.

## Common Pitfalls to Avoid

- **Analysis paralysis** - Don't overthink, read the plan and execute
- **Skipping clarifying questions** - Ask now, not after building wrong thing
- **Ignoring plan references** - The plan has links for a reason
- **Testing at the end** - Test continuously or suffer later
- **Forgetting TodoWrite** - Track progress or lose track of what's done
- **80% done syndrome** - Finish the feature, don't move on early
- **Over-reviewing simple changes** - Save reviewer agents for complex work
- **Forgetting to update Notion** - Keep todo status current

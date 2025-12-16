---
name: review
description: Perform exhaustive code reviews using multi-agent analysis, ultra-thinking, and worktrees
argument-hint: "[PR number, GitHub URL, branch name, or latest]"
---

# Review Command

<command_purpose> Perform exhaustive code reviews using multi-agent analysis, ultra-thinking, and Git worktrees for deep local inspection. </command_purpose>

## Introduction

<role>Senior Code Review Architect with expertise in security, performance, architecture, and quality assurance</role>

## Prerequisites

<requirements>
- Git repository with GitHub CLI (`gh`) installed and authenticated
- Clean main/master branch
- Proper permissions to create worktrees and access the repository
- For document reviews: Path to a markdown file or document
</requirements>

## Main Tasks

### 1. Determine Review Target & Setup (ALWAYS FIRST)

<review_target> #$ARGUMENTS </review_target>

<thinking>
First, I need to determine the review target type and set up the code for analysis.
</thinking>

#### Immediate Actions:

<task_list>

- [ ] Determine review type: PR number (numeric), GitHub URL, file path (.md), or empty (current branch)
- [ ] Check current git branch
- [ ] If ALREADY on the PR branch → proceed with analysis on current branch
- [ ] If DIFFERENT branch → offer to use worktree: "Use git-worktree skill for isolated Call `skill: git-worktree` with branch name
- [ ] Fetch PR metadata using `gh pr view --json` for title, body, files, linked issues
- [ ] Set up language-specific analysis tools
- [ ] Prepare security scanning environment
- [ ] Make sure we are on the branch we are reviewing. Use gh pr checkout to switch to the branch or manually checkout the branch.

Ensure that the code is ready for analysis (either in worktree or on current branch). ONLY then proceed to the next step.

</task_list>

#### Parallel Agents to review the PR:

<parallel_tasks>

Run ALL or most of these agents at the same time:

1. Task kieran-typescript-reviewer(PR content)
2. Task git-history-analyzer(PR content)
3. Task pattern-recognition-specialist(PR content)
4. Task architecture-strategist(PR content)
5. Task code-simplicity-reviewer(PR content)
6. Task security-sentinel(PR content)
7. Task performance-oracle(PR content)
8. Task data-integrity-guardian(PR content)

</parallel_tasks>

### 4. Ultra-Thinking Deep Dive Phases

<ultrathink_instruction> For each phase below, spend maximum cognitive effort. Think step by step. Consider all angles. Question assumptions. And bring all reviews in a synthesis to the user.</ultrathink_instruction>

<deliverable>
Complete system context map with component interactions
</deliverable>

#### Phase 3: Stakeholder Perspective Analysis

<thinking_prompt> ULTRA-THINK: Put yourself in each stakeholder's shoes. What matters to them? What are their pain points? </thinking_prompt>

<stakeholder_perspectives>

1. **Developer Perspective** <questions>

   - How easy is this to understand and modify?
   - Are the APIs intuitive?
   - Is debugging straightforward?
   - Can I test this easily? </questions>

2. **Operations Perspective** <questions>

   - How do I deploy this safely?
   - What metrics and logs are available?
   - How do I troubleshoot issues?
   - What are the resource requirements? </questions>

3. **End User Perspective** <questions>

   - Is the feature intuitive?
   - Are error messages helpful?
   - Is performance acceptable?
   - Does it solve my problem? </questions>

4. **Security Team Perspective** <questions>

   - What's the attack surface?
   - Are there compliance requirements?
   - How is data protected?
   - What are the audit capabilities? </questions>

5. **Business Perspective** <questions>
   - What's the ROI?
   - Are there legal/compliance risks?
   - How does this affect time-to-market?
   - What's the total cost of ownership? </questions> </stakeholder_perspectives>

#### Phase 4: Scenario Exploration

<thinking_prompt> ULTRA-THINK: Explore edge cases and failure scenarios. What could go wrong? How does the system behave under stress? </thinking_prompt>

<scenario_checklist>

- [ ] **Happy Path**: Normal operation with valid inputs
- [ ] **Invalid Inputs**: Null, empty, malformed data
- [ ] **Boundary Conditions**: Min/max values, empty collections
- [ ] **Concurrent Access**: Race conditions, deadlocks
- [ ] **Scale Testing**: 10x, 100x, 1000x normal load
- [ ] **Network Issues**: Timeouts, partial failures
- [ ] **Resource Exhaustion**: Memory, disk, connections
- [ ] **Security Attacks**: Injection, overflow, DoS
- [ ] **Data Corruption**: Partial writes, inconsistency
- [ ] **Cascading Failures**: Downstream service issues </scenario_checklist>

### 6. Multi-Angle Review Perspectives

#### Technical Excellence Angle

- Code craftsmanship evaluation
- Engineering best practices
- Technical documentation quality
- Tooling and automation assessment

#### Business Value Angle

- Feature completeness validation
- Performance impact on users
- Cost-benefit analysis
- Time-to-market considerations

#### Risk Management Angle

- Security risk assessment
- Operational risk evaluation
- Compliance risk verification
- Technical debt accumulation

#### Team Dynamics Angle

- Code review etiquette
- Knowledge sharing effectiveness
- Collaboration patterns
- Mentoring opportunities

### 4. Simplification and Minimalism Review

Run the Task code-simplicity-reviewer() to see if we can simplify the code.

### 5. Findings Synthesis and Todo Creation in Notion Sprint Planning

<critical_requirement> ALL findings MUST be stored in the Notion Sprint Planning database. Create Notion pages immediately after synthesis - do NOT present findings for user approval first. Use the Notion MCP tools for structured todo management. </critical_requirement>

#### Step 1: Synthesize All Findings

<thinking>
Consolidate all agent reports into a categorized list of findings.
Remove duplicates, prioritize by severity and impact.
</thinking>

<synthesis_tasks>

- [ ] Collect findings from all parallel agents
- [ ] Categorize by type: security, performance, architecture, quality, etc.
- [ ] Assign severity levels: 🔴 CRITICAL (P1), 🟡 IMPORTANT (P2), 🔵 NICE-TO-HAVE (P3)
- [ ] Remove duplicate or overlapping findings
- [ ] Estimate effort for each finding (XS/S/M/L)

</synthesis_tasks>

#### Step 2: Create Todo Pages in Notion Sprint Planning Database

<critical_instruction> Use the Notion MCP tools to create pages in the Sprint Planning database for ALL findings immediately. Do NOT present findings one-by-one asking for user approval. Create all pages in parallel using `notion-create-pages`, then summarize results to user. </critical_instruction>

**Notion Sprint Planning Database:**
- **Database ID:** `264b8f79-aff6-80c3-8d21-d30715d626fd`
- **Data Source ID:** `264b8f79-aff6-8097-9273-000b92a5b893`

**Database Schema:**
```sql
CREATE TABLE Sprint_Planning (
  "Project name" TEXT,  -- Title: "[P{priority}-{id}] {SEVERITY}: {title}"
  "Status" TEXT,        -- "Backlog", "Planned", "In progress", "Completed", "Cancelled", "On Hold"
  "Priority" TEXT,      -- "High" (P1), "Medium" (P2), "Low" (P3)
  "Category" TEXT,      -- JSON array: ["Bug Fix", "Enhancement", "Performance Improvement", "UI/UX", "New Feature"]
  "Effort" TEXT,        -- "XS", "S", "M", "L"
  "Team" TEXT,          -- JSON array: ["Platform", "Security", "AI", "Mobile"]
  "date:Date:start" TEXT  -- ISO-8601 date
)
```

**Naming Convention:**
```
[P{priority}-{id}] {SEVERITY}: {title}

Examples:
- [P1-035] CRITICAL: Same-Tab Sync Bug in useSelectedCalendarId
- [P2-039] IMPORTANT: Missing Error Handling UI
- [P3-035] NICE-TO-HAVE: Redundant Ternary in PageHeader
```

**Page Content Template:**
```markdown
## Problem Statement

{What's broken/missing and why it matters}

**PR:** #{pr_number} - {pr_title}

## Findings

### {Finding Title}
- **File:** `{file_path}:{line_numbers}`
- **Issue:** {description}
- **Impact:** {impact}

```{language}
{code_snippet}
```

## Proposed Solutions

### Option 1: {name} (Recommended)

{approach_description}

```{language}
{solution_code}
```

**Pros:**
- {pro1}
- {pro2}

**Cons:**
- {con1}

**Effort:** {XS/S/M/L} | **Risk:** {Low/Medium/High}

## Acceptance Criteria

- [ ] {criterion1}
- [ ] {criterion2}

## Resources

- **PR:** {pr_url}
- **Related:** {links}

## Work Log

### {date} - Discovery via Code Review
**By:** Claude Code ({agent_name})
**Actions:**
- {action1}
- {action2}

**Learnings:**
- {learning1}
```

**Implementation:**

Use `mcp__notion__notion-create-pages` with:
```json
{
  "parent": {"type": "data_source_id", "data_source_id": "264b8f79-aff6-8097-9273-000b92a5b893"},
  "pages": [
    {
      "properties": {
        "Project name": "[P1-035] CRITICAL: {title}",
        "Status": "Backlog",
        "Priority": "High",
        "Category": "[\"Bug Fix\"]",
        "Effort": "S",
        "Team": "[\"Platform\"]",
        "date:Date:start": "2025-12-13",
        "date:Date:is_datetime": 0
      },
      "content": "{markdown_content}"
    }
  ]
}
```

**Priority Mapping:**
- P1 (CRITICAL) → Priority: "High", Category includes "Bug Fix"
- P2 (IMPORTANT) → Priority: "Medium"
- P3 (NICE-TO-HAVE) → Priority: "Low"

**Team Mapping:**
- Security issues → Team: ["Security", "Platform"]
- Performance issues → Team: ["Platform"]
- UI/UX issues → Team: ["Platform"]

#### Step 3: Summary Report

After creating all Notion pages, present comprehensive summary:

```markdown
## ✅ Code Review Complete

**Review Target:** PR #XXXX - [PR Title]
**Branch:** [branch-name]

### Findings Summary:

- **Total Findings:** [X]
- **🔴 CRITICAL (P1):** [count] - BLOCKS MERGE
- **🟡 IMPORTANT (P2):** [count] - Should Fix
- **🔵 NICE-TO-HAVE (P3):** [count] - Enhancements

### Created in Notion Sprint Planning:

**P1 - Critical (BLOCKS MERGE):**
- [P1-035] {title} - {notion_url}
- [P1-036] {title} - {notion_url}

**P2 - Important:**
- [P2-039] {title} - {notion_url}

**P3 - Nice-to-Have:**
- [P3-035] {title} - {notion_url}

### Review Agents Used:
- security-sentinel
- performance-oracle
- architecture-strategist
- kieran-typescript-reviewer
- code-simplicity-reviewer
- pattern-recognition-specialist

### Next Steps:

1. **Address P1 Findings**: CRITICAL - must be fixed before merge
2. **View all findings in Notion**: https://www.notion.so/264b8f79aff680c38d21d30715d626fd
3. **Use /work command** to implement fixes from Notion todos
```

### Important: P1 Findings Block Merge

Any **🔴 P1 (CRITICAL)** findings must be addressed before merging the PR. Present these prominently and ensure they're resolved before accepting the PR.

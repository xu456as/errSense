---
name: is-source-code-located
description: A decision-making sub-agent that determines whether the error source code file location is known. This agent checks if the file path is available and routes the workflow to the appropriate next node in the graph.
version: 1.0.0
mode: decision
trigger:
  type: workflow_step
  condition: session.state.node == 'g4_IsSourceCodeLocated'
tools:
  - getFileLocation
  - setNextHop
output:
  format: routing_decision
  template: null
constraints:
  - timeoutSeconds: 30
  - maxRetries: 3
---

# Is Source Code Located Skill

## Overview

This skill is a decision-making agent responsible for determining whether the source code file location related to the error is known. It acts as a routing node in the workflow graph, directing the flow based on whether the file path is available.

## Purpose

The agent performs a simple but critical decision:
- **Check**: Determine if the source code file path is known and available
- **Route**: Direct the workflow to the next appropriate node based on the check result

## Context

When this skill is activated, the following context is expected:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stacktrace` | String | Yes | Error stacktrace containing file references |
| `errorPattern` | String | Yes | Normalized error message pattern |
| `projectKey` | String | No | Bitbucket project key (may be unknown) |
| `repository` | String | No | Repository slug/name (may be unknown) |
| `filePath` | String | No | Path to the source code file (may be unknown) |

## Workflow

### Step 1: Retrieve File Location

**Action**: Call `getFileLocation` tool

**Parameters**:
```json
{
  "stacktrace": "{stacktrace}",
  "errorPattern": "{errorPattern}"
}
```

**Purpose**: Extract or determine the file path from the stacktrace and error context

**Expected Response**:
- **Success with path**: File path is returned (non-empty string)
- **Empty path**: File location could not be determined
- **Multiple candidates**: Multiple potential file paths found
- **No match**: No file path found matching the stacktrace

### Step 2: Evaluate File Location Availability

**Decision Logic**:

```
IF filePath is NOT null AND filePath is NOT empty AND filePath ≠ "":
    → Source code location is KNOWN
ELSE:
    → Source code location is UNKNOWN
```

**Evaluation Criteria**:
| Condition | Result | Next Node |
|-----------|--------|-----------|
| File path exists and is non-empty string | KNOWN | `g4_CategoryErrorTypes` |
| File path is null | UNKNOWN | `g4_PromptUserViewSource` |
| File path is empty string ("") | UNKNOWN | `g4_PromptUserViewSource` |
| File path is whitespace only | UNKNOWN | `g4_PromptUserViewSource` |
| Tool returns error/no match | UNKNOWN | `g4_PromptUserViewSource` |

### Step 3: Route to Next Node

**Case A: Source Code Location Known**

When file path is successfully retrieved and is a non-empty string:

**Action**: Call `setNextHop` tool

**Parameters**:
```json
{
  "graph": "g4",
  "node": "g4_CategoryErrorTypes"
}
```

**Reason**: The source code file location is known, proceed to categorize the error type for further analysis.

---

**Case B: Source Code Location Unknown**

When file path is null, empty, or could not be determined:

**Action**: Call `setNextHop` tool

**Parameters**:
```json
{
  "graph": "g4",
  "node": "g4_PromptUserViewSource"
}
```

**Reason**: The source code file location is not known. Prompt the user to provide or locate the source code file manually.

## Decision Flow Diagram

```
┌─────────────────────────────────┐
│   IsSourceCodeLocated Agent     │
│   (Current Node: g4)            │
└─────────────────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Call getFileLocation│
    │ Tool                │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Check filePath      │
    └─────────────────────┘
              │
        ┌─────┴─────┐
        │           │
   [Path Exists?] [Empty/Null?]
        │           │
        ▼           ▼
    ┌───────┐   ┌──────────────┐
    │ KNOWN │   │   UNKNOWN    │
    └───────┘   └──────────────┘
        │           │
        ▼           ▼
    ┌──────────┐ ┌─────────────────┐
    │setNextHop│ │   setNextHop    │
    │(g4_      │ │   (g4_          │
    │Category  │ │   PromptUser    │
    │ErrorTypes│ │   ViewSource)   │
    └──────────┘ └─────────────────┘
```

## Tool Specifications

### getFileLocation

**Purpose**: Extract or determine the file path from stacktrace and error context

**Input Schema**:
```json
{
  "stacktrace": "string (required)",
  "errorPattern": "string (required)"
}
```

**Output Schema**:
```json
{
  "filePath": "string | null",
  "projectKey": "string | null",
  "repository": "string | null",
  "confidence": "number (0.0-1.0)",
  "candidates": "array of strings (optional)"
}
```

**Success Indicators**:
- `filePath` field is present and non-empty
- `filePath` is a valid path string (not null, not "", not whitespace)
- `confidence` field indicates successful match (> 0.5)

**Failure Indicators**:
- `filePath` field is `null`
- `filePath` field is empty string `""`
- `filePath` field contains only whitespace
- `confidence` field is low (< 0.5)
- Error message in response

---

### setNextHop

**Purpose**: Set the next node in the workflow graph for execution

**Input Schema**:
```json
{
  "graph": "string (required)",
  "node": "string (required)"
}
```

**Valid Graph**: `g4` (HelpFixCode workflow graph)

**Valid Nodes**:
- `g4_CategoryErrorTypes` - Proceed to error categorization (when file location is known)
- `g4_PromptUserViewSource` - Prompt user to locate source code (when file location is unknown)

## Session State Updates

After execution, the following state fields should be updated:

| Field | Value | Condition |
|-------|-------|-----------|
| `sourceCodeLocated` | `true` | File path is known and non-empty |
| `sourceCodeLocated` | `false` | File path is unknown or empty |
| `filePath` | `{path}` | When file location is known |
| `projectKey` | `{key}` | When extracted from file location |
| `repository` | `{repo}` | When extracted from file location |
| `currentNode` | `g4_CategoryErrorTypes` | When routing to categorization |
| `currentNode` | `g4_PromptUserViewSource` | When routing to user prompt |

## Error Handling

### Tool Call Failures

| Error Type | Handling | Next Node |
|------------|----------|-----------|
| Network timeout | Retry up to 3 times, then route to `g4_PromptUserViewSource` | `g4_PromptUserViewSource` |
| Stacktrace parsing error | Log error, route to `g4_PromptUserViewSource` | `g4_PromptUserViewSource` |
| No file match found | Route to `g4_PromptUserViewSource` | `g4_PromptUserViewSource` |
| Multiple ambiguous matches | Route to `g4_PromptUserViewSource` for user clarification | `g4_PromptUserViewSource` |

### Missing Required Parameters

If required parameters (`stacktrace`, `errorPattern`) are missing:
- **Action**: Route to `g4_PromptUserViewSource`
- **Reason**: Cannot determine file location without stacktrace context

### Edge Cases

| Scenario | Handling | Next Node |
|----------|----------|-----------|
| filePath = `null` | Treat as unknown | `g4_PromptUserViewSource` |
| filePath = `""` (empty string) | Treat as unknown | `g4_PromptUserViewSource` |
| filePath = `"   "` (whitespace) | Treat as unknown | `g4_PromptUserViewSource` |
| filePath = `"/path/to/file.java"` | Treat as known | `g4_CategoryErrorTypes` |
| Multiple candidate paths | Request user clarification | `g4_PromptUserViewSource` |

## Output Format

This agent does not generate a traditional output report. Instead, it produces a routing decision:

**Success Output (File Location Known)**:
```json
{
  "decision": "source_code_location_known",
  "nextNode": "g4_CategoryErrorTypes",
  "filePath": "/src/main/java/com/example/Service.java",
  "projectKey": "PROJECT_KEY",
  "repository": "repo-name",
  "confidence": 0.85
}
```

**Failure Output (File Location Unknown)**:
```json
{
  "decision": "source_code_location_unknown",
  "nextNode": "g4_PromptUserViewSource",
  "reason": "File path could not be determined from stacktrace"
}
```

## Implementation Notes

### File Path Validation

The agent should validate the file path before making a routing decision:

```java
// Pseudocode for path validation
boolean isPathKnown(String filePath) {
    if (filePath == null) return false;
    if (filePath.isEmpty()) return false;
    if (filePath.trim().isEmpty()) return false;
    return true;
}
```

### Confidence Threshold

If the `getFileLocation` tool returns a confidence score:
- **High confidence (> 0.7)**: Route to `g4_CategoryErrorTypes`
- **Low confidence (< 0.7)**: Route to `g4_PromptUserViewSource` for verification

### Multiple Candidates

If multiple file paths are returned:
- **Single high-confidence match**: Use that path, route to `g4_CategoryErrorTypes`
- **Multiple matches with similar confidence**: Route to `g4_PromptUserViewSource` for user to choose

## Notes

- This agent is a pure decision node with no user interaction
- The decision is binary: location known or unknown
- File path is stored in session state for subsequent agents to use
- The agent should complete execution within 30 seconds
- Empty string ("") is treated as "unknown", not "known"
- Whitespace-only paths are treated as "unknown"

## Security Considerations

- Stacktrace may contain sensitive information - handle with care
- File paths should be validated before storage
- Do not expose internal repository structure in logs
- Ensure proper access controls for file location queries

## Example Scenarios

### Scenario 1: Known File Location

**Input**:
```json
{
  "stacktrace": "java.lang.NullPointerException\n\tat com.example.UserService.getUser(UserService.java:45)\n\tat com.example.Controller.handleRequest(Controller.java:120)",
  "errorPattern": "NullPointerException at UserService.getUser"
}
```

**getFileLocation Response**:
```json
{
  "filePath": "src/main/java/com/example/UserService.java",
  "projectKey": "EXAMPLE",
  "repository": "backend-service",
  "confidence": 0.92
}
```

**Decision**: Route to `g4_CategoryErrorTypes`

---

### Scenario 2: Unknown File Location

**Input**:
```json
{
  "stacktrace": "java.lang.IllegalStateException: Connection failed",
  "errorPattern": "IllegalStateException: Connection failed"
}
```

**getFileLocation Response**:
```json
{
  "filePath": null,
  "projectKey": null,
  "repository": null,
  "confidence": 0.0
}
```

**Decision**: Route to `g4_PromptUserViewSource`

---

### Scenario 3: Empty File Path

**Input**:
```json
{
  "stacktrace": "Error occurred in application",
  "errorPattern": "Generic error"
}
```

**getFileLocation Response**:
```json
{
  "filePath": "",
  "projectKey": null,
  "repository": null,
  "confidence": 0.0
}
```

**Decision**: Route to `g4_PromptUserViewSource` (empty string treated as unknown)
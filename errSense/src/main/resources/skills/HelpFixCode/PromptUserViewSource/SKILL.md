---
name: prompt-user-view-source
description: A notification sub-agent that informs users when source code context is required. This agent provides guidance to users about the need to use the ViewSource feature before proceeding with HelpFixCode functionality.
version: 1.0.0
mode: notification
trigger:
  type: workflow_step
  condition: session.state.node == 'g4_PromptUserViewSource'
tools: []
input:
  required: []
  optional:
    - stacktrace
    - errorPattern
output:
  format: user_message
  template: null
constraints:
  - timeoutSeconds: 5
---

# Prompt User View Source Skill

## Overview

This skill is a notification agent that informs users when the HelpFixCode workflow cannot proceed without source code context. It provides clear guidance to users about the necessary steps to continue.

## Purpose

The agent performs a simple notification task:
- **Inform**: Tell users that source code context is required
- **Guide**: Direct users to use the ViewSource feature first
- **Explain**: Clarify the dependency between ViewSource and HelpFixCode features

## Context

When this skill is activated, the following context may be available:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stacktrace` | String | No | Error stacktrace for reference |
| `errorPattern` | String | No | Normalized error message pattern |
| `projectKey` | String | No | Bitbucket project key |
| `repository` | String | No | Repository name |
| `filePath` | String | No | Attempted file path (may be unknown) |

## Workflow

### Step 1: Display User Message

**Action**: Output a clear, helpful message to the user

**Message Content**:
```
I apologize, but I cannot proceed with the HelpFixCode analysis at this moment.

The HelpFixCode feature requires source code context to provide accurate error analysis and fix suggestions. Without access to the actual source code files, I would be unable to:

• Analyze the specific code causing the error
• Identify the root cause of the exception
• Provide contextual fix recommendations
• Show relevant code snippets in my responses

To continue, please use the ViewSource feature first to:

1. Locate the source code file mentioned in the error stacktrace
2. Load the file content into the current session context
3. Return to this HelpFixCode workflow

Once the source code is loaded, I will be able to:

• Examine the exact code implementation
• Trace the error back to its source
• Provide detailed analysis and potential solutions
• Suggest specific code changes if applicable

Please click on the "ViewSource" option or navigate to the source code viewer to provide the necessary context.
```

## Message Format

The output message should be formatted for clarity and readability:

**Header Section**:
```
⚠️ Source Code Context Required
```

**Explanation Section**:
```
I cannot proceed with HelpFixCode analysis without source code context.
```

**Impact Section**:
```
Without source code, I am unable to:
• [Capability 1]
• [Capability 2]
• [Capability 3]
```

**Guidance Section**:
```
To continue, please:
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

**Next Steps Section**:
```
Once source code is loaded, I will be able to:
• [Next capability 1]
• [Next capability 2]
• [Next capability 3]
```

## Visual Presentation

### Recommended Format

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ⚠️  Source Code Context Required                      │
│                                                         │
│   I cannot proceed with HelpFixCode analysis without    │
│   access to the source code files.                      │
│                                                         │
│   ─────────────────────────────────────────────────────  │
│                                                         │
│   Without source code, I am unable to:                  │
│                                                         │
│   ✗  Analyze the specific code causing the error        │
│   ✗  Identify the root cause of the exception           │
│   ✗  Provide contextual fix recommendations            │
│   ✗  Show relevant code snippets in responses           │
│                                                         │
│   ─────────────────────────────────────────────────────  │
│                                                         │
│   Next Steps:                                           │
│                                                         │
│   1️⃣  Click on "ViewSource" in the navigation          │
│   2️⃣  Locate the file from the error stacktrace         │
│   3️⃣  Load the source code into the session             │
│   4️⃣  Return to HelpFixCode workflow                    │
│                                                         │
│   ─────────────────────────────────────────────────────  │
│                                                         │
│   Once source code is available, I will be able to:     │
│                                                         │
│   ✓  Examine the exact code implementation              │
│   ✓  Trace the error back to its source                 │
│   ✓  Provide detailed analysis and solutions            │
│   ✓  Suggest specific code changes                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Interaction Flow

```
┌─────────────────────────────────┐
│ HelpFixCode Workflow            │
│ (Current Node: g4)              │
└─────────────────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ IsSourceCodeLocated │
    │ Agent               │
    └─────────────────────┘
              │
              │ File Not Found
              ▼
    ┌─────────────────────┐
    │ PromptUserViewSource│
    │ Agent (This Node)   │
    └─────────────────────┘
              │
              │ Display Message
              ▼
    ┌─────────────────────┐
    │ User Action Required│
    │                     │
    │ • ViewSource        │
    │ • Load Source Code  │
    └─────────────────────┘
```

## Error Handling

This agent has minimal error handling requirements as it primarily displays static content:

| Scenario | Handling |
|----------|----------|
| Normal execution | Display message successfully |

## Tool Specifications

This agent does **not** require any tools. It is a pure notification agent.

**Tool Usage**: None required

## Output Format

**Primary Output**: User-facing message (text/HTML)

**Metadata**:
```json
{
  "node": "g4_PromptUserViewSource",
  "agentType": "notification",
  "toolsRequired": []
}
```

## Tone and Style Guidelines

**Do**:
- Be polite and understanding
- Clearly explain what is needed
- Provide actionable next steps
- Be concise and to the point
- Use visual formatting for readability

**Don't**:
- Be technical or use jargon
- Make assumptions about user knowledge
- Provide error analysis without source code
- Suggest workarounds without proper context
- Make the user feel bad about the situation

## Example Message Variations

### Short Version
```
⚠️ Source Code Required

I need access to the source code files to help you with this error.

Please use the ViewSource feature to load the relevant source code, then return to this workflow.
```

### Detailed Version
```
📋 Source Code Context Required

I apologize, but I cannot analyze this error without seeing the actual source code.

Current Limitation:
──────────────────
The HelpFixCode feature analyzes code directly. Without source code access, I can only provide generic advice.

What You Need To Do:
────────────────────
1. Navigate to the ViewSource feature
2. Enter the project and repository details
3. Locate and load the source file from the error stacktrace
4. Return to HelpFixCode

Benefits After Loading Source:
──────────────────────────────
✓ Precise error location and analysis
✓ Contextual fix recommendations
✓ Code-specific suggestions
✓ Detailed root cause explanation

Please click on "ViewSource" in the navigation to begin.
```

## Security Considerations

- Ensure the message does not expose sensitive system information
- Do not log detailed error context in the notification
- Keep the message generic enough to be reusable
- Verify user has appropriate permissions before displaying source code options
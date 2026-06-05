---
name: root-cause-analysis
description: A specialized sub-agent for analyzing error stacktraces to identify potential root causes and provide actionable insights. This agent leverages domain knowledge and pattern recognition to diagnose common software failure patterns.
version: 1.0.0
mode: inversion
trigger:
  type: stacktrace_available
  condition: session.state.stacktrace exists and session.state.analysisStage == 'rca'
tools:
  - getStacktraceDetails
  - getErrorHistory
  - getCodeRepository
  - getDependencyInfo
  - getEnvironmentConfig
input:
  required:
    - stacktrace
    - errorPattern
  optional:
    - projectKey
    - repository
    - affectedComponent
    - errorFrequency
    - recentChanges
output:
  format: structured
  template: assets/output-template.md
constraints:
  - maxAnalysisDepth: 5
  - maxCausesPerCategory: 3
  - confidenceThreshold: 0.6
  - timeoutSeconds: 60
---

# Root Cause Analysis Skill

## Overview

This skill enables the AI agent to perform deep root cause analysis on error stacktraces. It systematically analyzes the provided stacktrace, identifies patterns, and generates potential root causes with supporting examples and mitigation suggestions.

## Context

When this skill is activated, the agent expects the following context to be available:
- **stacktrace**: Complete error stacktrace from the failed execution
- **errorPattern**: Extracted error message pattern
- **projectKey**: (Optional) Bitbucket project key for repository context
- **repository**: (Optional) Repository name for code lookup
- **affectedComponent**: (Optional) The component/service affected by the error
- **errorFrequency**: (Optional) How often this error occurs
- **recentChanges**: (Optional) Recent code changes that might have introduced the issue

## Available Tools

| Tool Name | Description | Usage |
|-----------|-------------|-------|
| `getStacktraceDetails` | Extracts structured information from stacktrace | Parse exception type, message, and stack frames |
| `getErrorHistory` | Retrieves historical occurrences of similar errors | Identify recurring patterns |
| `getCodeRepository` | Accesses source code repository | Look up relevant code paths |
| `getDependencyInfo` | Retrieves dependency versions and known issues | Check for known library bugs |
| `getEnvironmentConfig` | Gets environment configuration details | Identify environment-specific issues |

## Session State

The following state fields are managed during RCA execution:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stacktrace` | String | Yes | Raw stacktrace text |
| `errorPattern` | String | Yes | Normalized error message pattern |
| `projectKey` | String | No | Bitbucket project identifier |
| `repository` | String | No | Target repository name |
| `affectedComponent` | String | No | Affected module/component |
| `errorFrequency` | String | No | 'low'/'medium'/'high'/'critical' |
| `recentChanges` | String | No | Commit IDs or change descriptions |
| `analysisResult` | Object | No | Final analysis output |
| `confidenceScores` | Map | No | Confidence levels for each cause |

## Workflow

### Phase 1: Initial Analysis
1. **Extract Key Information**: Parse the stacktrace to identify:
   - Exception type and message
   - Top-level failing method
   - Critical stack frames
   - Potential root package/class

2. **Identify Error Category**: Classify the error into one of these categories:
   - NullPointerException
   - IllegalArgumentException
   - IllegalStateException
   - IOException/Resource Issues
   - Concurrency/Locking Issues
   - Configuration/Environment Issues
   - Dependency/Third-party Issues

### Phase 2: Pattern Recognition
1. **Search Error History**: Look for similar errors in historical data
2. **Identify Code Patterns**: Analyze stack frames for common problematic patterns
3. **Check Recent Changes**: Cross-reference with recent commits if available

### Phase 3: Root Cause Generation
Based on the analysis, generate potential root causes with:
- **Confidence Score**: 0.0-1.0 indicating likelihood
- **Description**: Clear explanation of the potential cause
- **Example Scenario**: Concrete example demonstrating how this cause manifests
- **Evidence**: Specific lines from stacktrace supporting this hypothesis
- **Mitigation**: Suggested fix or workaround

### Phase 4: Output Generation
Compile findings into a structured report with prioritized root causes.

## Root Cause Categories & Examples

### 1. NullPointerException
**Pattern**: Unexpected null reference in critical path

**Common Causes**:
- Missing null check before method invocation
- Optional not properly handled
- Null returned from external API without validation

**Example**:
```java
// Problematic code
User user = userRepository.findById(userId);
String email = user.getEmail(); // NullPointerException if user is null

// Solution
Optional<User> userOpt = userRepository.findById(userId);
String email = userOpt.map(User::getEmail).orElse(null);
```

### 2. IllegalArgumentException
**Pattern**: Invalid input parameter causing method failure

**Common Causes**:
- Missing input validation
- Out-of-range values
- Invalid format (e.g., malformed JSON, date)
- Empty collections passed to methods requiring non-empty

**Example**:
```java
// Problematic code
public void processOrder(Order order) {
    if (order.getItems().size() > MAX_ITEMS) { // NullPointerException if items is null
        throw new IllegalArgumentException("Too many items");
    }
}

// Solution
public void processOrder(Order order) {
    if (order.getItems() == null || order.getItems().isEmpty()) {
        throw new IllegalArgumentException("Order items cannot be null or empty");
    }
    if (order.getItems().size() > MAX_ITEMS) {
        throw new IllegalArgumentException("Too many items");
    }
}
```

### 3. IllegalStateException
**Pattern**: Object in invalid state for requested operation

**Common Causes**:
- Resources not properly initialized
- Operations called out of sequence
- Concurrent modification during iteration
- Connection/stream already closed

**Example**:
```java
// Problematic code
public class DataProcessor {
    private Connection conn;
    
    public void process() {
        conn.close(); // Connection closed
        // Later in code...
        conn.createStatement(); // IllegalStateException
    }
}

// Solution
public class DataProcessor {
    private Connection conn;
    
    public void process() {
        try (Statement stmt = conn.createStatement()) {
            // Use statement
        } finally {
            if (conn != null && !conn.isClosed()) {
                conn.close();
            }
        }
    }
}
```

### 4. IOException & Resource Issues
**Pattern**: Failed I/O operation or resource exhaustion

**Common Causes**:
- Missing file permissions
- Network connectivity issues
- Connection pool exhaustion
- File not found or locked
- Memory/thread pool exhaustion

**Example**:
```java
// Problematic code
public String readFile(String path) throws IOException {
    FileInputStream fis = new FileInputStream(path);
    // If this throws, fis is never closed
    BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
    return reader.readLine();
}

// Solution
public String readFile(String path) throws IOException {
    try (FileInputStream fis = new FileInputStream(path);
         BufferedReader reader = new BufferedReader(new InputStreamReader(fis))) {
        return reader.readLine();
    }
}
```

### 5. Concurrency & Locking Issues
**Pattern**: Thread safety violations or deadlocks

**Common Causes**:
- Unsynchronized access to shared mutable state
- Circular lock acquisition order
- Race conditions in lazy initialization
- Unprotected static state modification

**Example**:
```java
// Problematic code
public class Counter {
    private int count = 0;
    
    public void increment() {
        count++; // Not thread-safe
    }
}

// Solution
public class Counter {
    private final AtomicInteger count = new AtomicInteger(0);
    
    public void increment() {
        count.incrementAndGet();
    }
}
```

### 6. Configuration & Environment Issues
**Pattern**: Environment-specific failures

**Common Causes**:
- Missing environment variables
- Incorrect configuration values
- Database connection string errors
- Missing or misconfigured external services

**Example**:
```yaml
# Problematic configuration
database:
  url: jdbc:mysql://localhost:3306/mydb
  username: ${DB_USER}  # Missing in environment
  password: ${DB_PASSWORD}  # Missing in environment

# Solution - Provide defaults or validate
database:
  url: jdbc:mysql://localhost:3306/mydb
  username: ${DB_USER:default_user}
  password: ${DB_PASSWORD:}
```

### 7. Dependency & Third-party Issues
**Pattern**: Failures originating from external libraries

**Common Causes**:
- Incompatible library versions
- Known bugs in specific versions
- Missing transitive dependencies
- API breaking changes

**Example**:
```xml
<!-- Problematic - using old version with known bug -->
<dependency>
    <groupId>com.example</groupId>
    <artifactId>utils</artifactId>
    <version>1.0.0</version> <!-- Known memory leak -->
</dependency>

<!-- Solution - upgrade to fixed version -->
<dependency>
    <groupId>com.example</groupId>
    <artifactId>utils</artifactId>
    <version>1.2.0</version> <!-- Bug fixed -->
</dependency>
```

## Output Format

The RCA agent will generate a structured response with the following sections:

### Root Cause Analysis Report

**Error Overview**
- Error Type: [Exception class]
- Error Message: [Extracted message]
- Occurrence: [Frequency level]

**Identified Root Causes**

| Rank | Confidence | Category | Description |
|------|------------|----------|-------------|
| 1 | XX% | [Category] | [Cause description] |
| 2 | XX% | [Category] | [Cause description] |
| 3 | XX% | [Category] | [Cause description] |

**Detailed Analysis**

For each high-confidence cause:
- **Hypothesis**: Detailed explanation of the potential root cause
- **Stacktrace Evidence**: Specific lines from the stacktrace supporting this hypothesis
- **Example Scenario**: Code example showing how this issue typically manifests
- **Suggested Fix**: Recommended solution or workaround

**Recommendations**

- Priority 1: [Immediate action]
- Priority 2: [Secondary action]
- Priority 3: [Preventive measures]

## Error Handling

1. **Insufficient Data**: If stacktrace is incomplete or unclear, request additional context
2. **Ambiguous Patterns**: When multiple causes have similar confidence scores, present all possibilities
3. **Tool Failures**: Gracefully handle tool call failures and proceed with available information
4. **Timeout**: If analysis exceeds time limit, return partial results with best-effort analysis

## Notes

- The RCA agent works best with complete stacktraces including line numbers
- Providing recent code changes significantly improves analysis accuracy
- Confidence scores are calculated based on pattern matching and historical data
- For production-critical issues, always verify analysis against actual code

## Security Considerations

- Stacktraces may contain sensitive information - ensure proper sanitization before analysis
- Repository access requires appropriate authentication
- Avoid logging or storing raw stacktraces in unsecure locations
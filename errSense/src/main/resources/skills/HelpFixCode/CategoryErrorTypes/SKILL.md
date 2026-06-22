---
name: category-error-types
description: A decision-making sub-agent that categorizes error types and determines whether fixes can be applied through code modifications. This agent analyzes stacktrace and source code to provide targeted code fix suggestions or guide users to investigate other aspects.
version: 1.0.0
mode: analysis
trigger:
  type: workflow_step
  condition: session.state.node == 'g4_CategoryErrorTypes'
tools:
  - getFileLocation
  - getFileContent
  - readStacktrace
input:
  required: []
  optional:
    - stacktrace
    - fileLocation
    - fileContent
output:
  format: analysis_report
  template: null
constraints:
  - timeoutSeconds: 60
  - maxRetries: 2
---

# Category Error Types Skill

## Overview

This skill is an analysis agent responsible for categorizing errors and determining whether they can be resolved through code modifications. It combines stacktrace analysis with source code inspection to provide targeted recommendations.

## Purpose

The agent performs three key tasks:
- **Categorize**: Classify the error into a well-defined error type
- **Determine Fixability**: Assess whether the error can be resolved through code changes
- **Recommend**: Provide either code modification suggestions or guide users to investigate other aspects

## Context

When this skill is activated, the following tools are guaranteed to have valid returns:
- `getFileLocation` - Returns the source code file location in Bitbucket
- `getFileContent` - Returns the full source code file content
- `readStacktrace` - Returns the error stacktrace information

## Error Classification

### Code-Repairable Errors

Errors in this category can be resolved by modifying the source code. These include:

#### 1. Null Safety Issues

**Description**: Errors caused by null pointer dereferences or missing null checks

**Subtypes**:
- NullPointerException
- NullPointerException on auto-unboxing
- Failed null checks

**Detection Criteria**:
- Stacktrace shows `java.lang.NullPointerException`
- Error occurs when accessing methods/properties on potentially null objects
- Code lacks null validation before usage

**Fix Strategy**:
- Add null checks before accessing object properties
- Use Optional patterns for nullable return types
- Initialize variables with safe defaults
- Add defensive null guards

**Example**:
```java
// Problem
String name = user.getName();
int length = name.length(); // NullPointerException if name is null

// Fix
String name = user.getName();
if (name != null) {
    int length = name.length();
}
```

---

#### 2. Input Validation Issues

**Description**: Errors caused by invalid, malformed, or unexpected input values

**Subtypes**:
- IllegalArgumentException
- NumberFormatException
- ParseException
- InvalidParameterException

**Detection Criteria**:
- Stacktrace shows validation-related exceptions
- Error occurs during input parsing/conversion
- Code accepts input without proper validation

**Fix Strategy**:
- Add input validation before processing
- Use try-catch blocks for parsing operations
- Define clear input constraints and boundaries
- Provide meaningful error messages for invalid inputs

**Example**:
```java
// Problem
int age = Integer.parseInt(request.getParameter("age")); // Throws on invalid input

// Fix
String ageStr = request.getParameter("age");
if (ageStr != null && ageStr.matches("\\d+")) {
    int age = Integer.parseInt(ageStr);
} else {
    throw new IllegalArgumentException("Invalid age format");
}
```

---

#### 3. Resource Management Issues

**Description**: Errors caused by improper handling of resources (files, connections, streams)

**Subtypes**:
- IOException
- FileNotFoundException
- SocketTimeoutException
- ConnectionException

**Detection Criteria**:
- Stacktrace shows IO-related exceptions
- Error occurs during resource access/operation
- Code lacks proper resource cleanup (try-with-resources)

**Fix Strategy**:
- Use try-with-resources for auto-closeable resources
- Add proper error handling for resource operations
- Implement connection pooling for expensive resources
- Add timeout configurations for network operations

**Example**:
```java
// Problem
FileInputStream fis = new FileInputStream(file);
// ... processing ...
fis.close(); // May not close on exception

// Fix
try (FileInputStream fis = new FileInputStream(file)) {
    // ... processing ...
} catch (IOException e) {
    // Handle error
}
```

---

#### 4. Boundary/Condition Issues

**Description**: Errors caused by incorrect boundary conditions or missing guard clauses

**Subtypes**:
- ArrayIndexOutOfBoundsException
- StringIndexOutOfBoundsException
- IndexOutOfBoundsException
- ConcurrentModificationException

**Detection Criteria**:
- Stacktrace shows boundary-related exceptions
- Error occurs during collection/array access
- Code lacks boundary validation before access

**Fix Strategy**:
- Add boundary checks before array/collection access
- Use safe iteration patterns
- Validate collection size before indexing
- Use defensive programming for edge cases

**Example**:
```java
// Problem
List<String> items = getItems();
String first = items.get(0); // Throws if empty

// Fix
List<String> items = getItems();
if (!items.isEmpty()) {
    String first = items.get(0);
}
```

---

#### 5. Logic/Algorithm Issues

**Description**: Errors caused by flawed business logic or algorithmic mistakes

**Subtypes**:
- IllegalStateException
- ArithmeticException (division by zero)
- ConcurrentModificationException
- UnsupportedOperationException

**Detection Criteria**:
- Stacktrace shows logic-related exceptions
- Error occurs when object is in unexpected state
- Code assumes conditions that may not hold

**Fix Strategy**:
- Add state validation before operations
- Check preconditions before executing logic
- Use enum-based state machines for complex state management
- Add defensive checks for edge cases

**Example**:
```java
// Problem
public void processOrder(Order order) {
    order.ship(); // May fail if order not paid
}

// Fix
public void processOrder(Order order) {
    if (order.getStatus() != OrderStatus.PAID) {
        throw new IllegalStateException("Order must be paid before shipping");
    }
    order.ship();
}
```

---

#### 6. Configuration/Environment Issues (Code-Fixable)

**Description**: Errors caused by missing or invalid configuration that can be handled in code

**Subtypes**:
- MissingResourceException
- IllegalArgumentException (config-related)
- ConfigurationException

**Detection Criteria**:
- Error occurs during configuration loading
- Required properties are missing or invalid
- Code lacks fallback configurations

**Fix Strategy**:
- Add configuration validation on startup
- Provide default values for optional configurations
- Implement graceful degradation for missing configs
- Add configuration sanity checks

**Example**:
```java
// Problem
String apiKey = config.getProperty("api.key");
callApi(apiKey); // Fails if null

// Fix
String apiKey = config.getProperty("api.key");
if (apiKey == null || apiKey.isEmpty()) {
    throw new ConfigurationException("API key is required");
}
callApi(apiKey);
```

---

### Non-Code-Repairable Errors

Errors in this category require investigation beyond code changes. These include:

#### 1. External Dependency/Service Issues

**Description**: Errors caused by downstream systems, third-party services, or dependencies

**Subtypes**:
- HttpClientErrorException (4xx errors)
- HttpServerErrorException (5xx errors)
- RemoteException
- TimeoutException (external service)

**Detection Criteria**:
- Error occurs during external service calls
- Stacktrace shows HTTP/client library exceptions
- Error messages indicate service unavailability or failures

**Investigation Guide**:
- Check if the external service is operational
- Verify API credentials and permissions
- Review service rate limits and quotas
- Examine network connectivity to the service
- Check for service version compatibility

**Example**:
```
Symptom: 503 Service Unavailable from Payment Gateway
Action: Contact payment provider, check service status page, retry later
```

---

#### 2. Data Integrity/Consistency Issues

**Description**: Errors caused by corrupted, inconsistent, or invalid data in storage

**Subtypes**:
- DataAccessException
- SQLIntegrityConstraintViolationException
- ConstraintViolationException
- DataTruncation

**Detection Criteria**:
- Error occurs during database operations
- Stacktrace shows SQL/database exceptions
- Error messages indicate constraint violations or data issues

**Investigation Guide**:
- Check database integrity constraints
- Verify data migration scripts
- Review data validation rules
- Check for concurrent data modifications
- Examine data import/export processes

**Example**:
```
Symptom: Unique constraint violation on user email
Action: Check for duplicate data, review data cleanup processes
```

---

#### 3. Infrastructure/Environment Issues

**Description**: Errors caused by infrastructure problems, environment misconfiguration, or resource limitations

**Subtypes**:
- OutOfMemoryError
- StackOverflowError
- SocketException
- BindException

**Detection Criteria**:
- Error occurs at JVM/system level
- Stacktrace shows system-level exceptions
- Error messages indicate resource exhaustion

**Investigation Guide**:
- Check JVM heap/stack configurations
- Review system resource usage (CPU, memory, disk)
- Verify network connectivity and firewall rules
- Check environment variable configurations
- Review deployment settings and infrastructure state

**Example**:
```
Symptom: OutOfMemoryError during peak traffic
Action: Increase heap size, optimize memory usage, implement caching
```

---

#### 4. Authentication/Authorization Issues

**Description**: Errors caused by authentication failures or insufficient permissions

**Subtypes**:
- AuthenticationException
- AccessDeniedException
- InvalidTokenException
- ExpiredTokenException

**Detection Criteria**:
- Error occurs during security checks
- Stacktrace shows security-related exceptions
- Error messages indicate auth/permission failures

**Investigation Guide**:
- Verify user credentials and authentication tokens
- Check role-based access control configurations
- Review permission assignments
- Validate token expiration and refresh mechanisms
- Check for session timeout issues

**Example**:
```
Symptom: AccessDeniedException for admin endpoint
Action: Verify user roles, check permission mappings
```

---

#### 5. Network/Connectivity Issues

**Description**: Errors caused by network problems, DNS issues, or connectivity failures

**Subtypes**:
- UnknownHostException
- ConnectException
- SocketTimeoutException
- SSLHandshakeException

**Detection Criteria**:
- Error occurs during network operations
- Stacktrace shows network-related exceptions
- Error messages indicate connection failures

**Investigation Guide**:
- Verify DNS resolution
- Check network connectivity and latency
- Review firewall and security group rules
- Validate SSL certificates and TLS configurations
- Check proxy settings and network routing

**Example**:
```
Symptom: UnknownHostException for database host
Action: Verify DNS configuration, check network connectivity
```

---

## Workflow

### Step 1: Analyze Stacktrace

**Action**: Use `readStacktrace` to extract error information

**Key Extraction**:
- Exception type and message
- Top-level stack frame (location of error)
- Related method names and file paths
- Error context and parameters

### Step 2: Inspect Source Code

**Action**: Use `getFileContent` to examine the relevant code

**Key Analysis**:
- Locate the exact line where exception is thrown
- Understand the surrounding code context
- Identify variables, parameters, and conditions involved
- Check for existing error handling patterns

### Step 3: Determine Error Category

**Action**: Apply classification logic

**Decision Flow**:
```
1. Identify exception type from stacktrace
2. Check if exception matches code-repairable categories
3. If code-repairable:
   a. Determine specific subtype
   b. Generate targeted code fix suggestion
4. If non-code-repairable:
   a. Determine specific subtype
   b. Provide investigation guidance
```

### Step 4: Generate Output

**Case A: Code-Repairable Error**

**Output Structure**:
```markdown
## Error Analysis

**Error Type**: <Category Name>
**Exception**: <Exception Class>
**Location**: <File Name>:<Line Number>
**Method**: <Method Name>

### Root Cause
<Clear description of the root cause>

### Code Fix Suggestion
<Targeted code modification>

### Before
```java
<Original code snippet>
```

### After
```java
<Fixed code snippet>
```

### Explanation
<Why this fix works and what it addresses>
```

**Case B: Non-Code-Repairable Error**

**Output Structure**:
```markdown
## Error Analysis

**Error Type**: <Category Name>
**Exception**: <Exception Class>
**Location**: <File Name>:<Line Number>

### Assessment
This error is not directly fixable through code modification. The issue originates from external factors.

### Recommended Investigation

**Category**: <Specific Non-Code Category>

**Investigation Steps**:
1. <Step 1>
2. <Step 2>
3. <Step 3>

**Possible Root Causes**:
- <Potential Cause 1>
- <Potential Cause 2>

**External Dependencies to Check**:
- <Dependency 1>
- <Dependency 2>

### Note
While code changes cannot directly resolve this issue, consider implementing:
- <Monitoring/Safety measures>
- <Retry mechanisms>
- <Circuit breakers>
```

## Decision Flow Diagram

```
┌─────────────────────────────────────┐
│   CategoryErrorTypes Agent          │
│   (Current Node: g4_CategoryErrorTypes)│
└─────────────────────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Analyze Stacktrace  │
    │ • Exception Type    │
    │ • Error Location    │
    │ • Context           │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Inspect Source Code │
    │ • Error Line        │
    │ • Surrounding Logic │
    │ • Existing Handling │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ Categorize Error    │
    │ • Code-Repairable?  │
    │ • Specific Subtype  │
    └─────────────────────┘
              │
        ┌─────┴─────┐
        │           │
   [Code Fixable?]  [Not Code Fixable?]
        │           │
        ▼           ▼
    ┌──────────┐ ┌──────────────────┐
    │ Generate │ │ Generate          │
    │ Code Fix │ │ Investigation    │
    │ Suggestion│ │ Guidance         │
    └──────────┘ └──────────────────┘
```

## Critical Guidelines

### Code Fix Principles

1. **Be Specific**: Only fix the identified issue, do not add unrelated defensive checks
2. **Avoid Over-Engineering**: Do not implement complex patterns for simple problems
3. **Follow Existing Patterns**: Use the same error handling style as the codebase
4. **Add Meaningful Messages**: Include descriptive error messages for debugging
5. **Consider Impact**: Ensure the fix doesn't break existing functionality

### Non-Code Investigation Principles

1. **Be Clear**: Clearly state why code changes won't solve the problem
2. **Be Actionable**: Provide specific steps the user can take
3. **Be Helpful**: Suggest monitoring or safety measures where applicable
4. **Avoid Blame**: Focus on solutions, not blame
5. **Be Concise**: Don't overwhelm with too many investigation paths

### Anti-Patterns to Avoid

❌ **Infinite Defensive Coding**: Don't add `if (x != null)` checks for every variable
❌ **Generic Catch-All**: Don't use `catch (Exception e)` without specific handling
❌ **Magic Fixes**: Don't suggest code changes without understanding the root cause
❌ **Copy-Paste Solutions**: Don't apply the same fix pattern to different error types
❌ **Ignoring External Factors**: Don't assume all errors can be fixed with code changes

### Best Practices

✅ **Targeted Fixes**: Apply fixes only where the error occurs
✅ **Root Cause Analysis**: Understand why the error happens before suggesting fixes
✅ **Error Categorization**: Use the predefined categories for consistent recommendations
✅ **Clear Communication**: Explain the reasoning behind recommendations
✅ **Safety Measures**: Suggest monitoring and alerting for non-code issues

## Output Format

### Code-Repairable Output

```json
{
  "category": "code_repairable",
  "subtype": "null_safety",
  "exceptionType": "java.lang.NullPointerException",
  "location": "UserService.java:45",
  "method": "getUser",
  "rootCause": "User object is null when getName() is called",
  "fixSuggestion": "Add null check before accessing user properties",
  "codeBefore": "...",
  "codeAfter": "...",
  "confidence": 0.95
}
```

### Non-Code-Repairable Output

```json
{
  "category": "non_code_repairable",
  "subtype": "external_dependency",
  "exceptionType": "org.springframework.web.client.HttpClientErrorException",
  "location": "PaymentService.java:120",
  "method": "processPayment",
  "assessment": "Payment gateway returned 503 Service Unavailable",
  "investigationSteps": ["Check payment gateway status", "Verify API credentials"],
  "safetyMeasures": ["Implement retry mechanism", "Add circuit breaker"]
}
```

## Notes

- This agent receives guaranteed valid tool responses - no need for defensive null checks on tool outputs
- Focus on the specific error at hand, avoid speculative fixes
- Use error categorization to guide recommendation types
- Code fixes should be minimal and targeted
- Non-code recommendations should be actionable and specific
- Always explain the reasoning behind categorization and recommendations

## Security Considerations

- Do not expose sensitive configuration values in error analysis
- Be cautious when displaying stacktrace details to users
- Ensure error messages don't reveal internal system information
- Consider data privacy when analyzing source code
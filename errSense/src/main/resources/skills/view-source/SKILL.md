---
name: view-source
description: An inversion-mode skill that automatically locates and analyzes source code based on stacktrace information to identify the exact file and code line causing exceptions
version: 1.0.0
mode: inversion
trigger:
  type: stacktrace_provided
  condition: session.state.stacktrace exists
tools:
  - getAllProjects
  - getRepositoriesByProject
  - listAllFilesRecursivelyByRepository
  - getAllFilesFromAllRepositories
  - getFileContent
input:
  required:
    - stacktrace
  optional:
    - projectKey
    - repository
    - file
    - at
output:
  format: structured
  template: assets/output-template.md
constraints:
  - file_matching_threshold: 0.7
  - max_file_search_results: 50
  - default_branch: master
  - retry_attempts: 3
---

# View Source Skill

## Overview

This skill helps users investigate runtime errors by locating and analyzing source code based on stacktrace information. It automatically searches through Bitbucket repositories to find the exact file and code line that caused the exception.

## Context

When this skill is invoked, the agent architecture guarantees that stacktrace information has already been obtained from the user.

## Available Bitbucket Tools

The following tools are available for interacting with Bitbucket:

- `getAllProjects` - List all projects in Bitbucket
- `getRepositoriesByProject` - Get all repositories under a specific project
- `listAllFilesRecursivelyByRepository` - List all files in a repository recursively
- `getAllFilesFromAllRepositories` - Get all files from all repositories
- `getFileContent` - Retrieve the content of a specific file

## Session State

The session state contains the following key information (may be partially missing):

| Field | Description | Status |
|-------|-------------|--------|
| `projectKey` | The project key in Bitbucket | Optional |
| `repository` | The repository name | Optional |
| `file` | The file path/name | Optional |
| `at` | Commit ID, branch, or tag (default: master) | Optional |
| `stacktrace` | Contains partial file name and error details | Required |

## Workflow

### Action 1: Initial Search

**Trigger:** Skill starts with stacktrace information available

**Steps:**
1. Call `getAllFilesFromAllRepositories` to retrieve all file paths
2. Match returned file names against the partial file name in the stacktrace
3. If a matching file is found:
   - Proceed to **File Read Action**
   - Update session state with `projectKey`, `repository`, and `file`
   - Output the answer to the user (exception method and highlighted code line)
4. If no matching file is found:
   - Proceed to **Info Query Action**

### Action 2: File Read

**Trigger:** A potential source file has been identified

**Steps:**
1. Call `getFileContent` to retrieve the file content
2. Cross-reference the method name and line number from the stacktrace
3. Verify if the specified line in the file is the exception throwing point
4. If confirmed:
   - This file is confirmed as the source code that threw the exception
   - Return the file content with the exception line highlighted
5. If not confirmed:
   - Continue searching for other matching files

### Action 3: Info Query

**Trigger:** Initial search failed to find matching files

**Steps:**
1. Prompt the user to provide:
   - `projectKey` - The project key
   - `repository` - The repository name
   - `at` - The commit ID, branch, or tag
2. Call `listAllFilesRecursivelyByRepository` with the provided information
3. Match returned file names against the partial file name in the stacktrace
4. If a matching file is found:
   - Proceed to **File Read Action**
   - Update session state with `projectKey`, `repository`, and `file`
   - Output the answer to the user (exception method and highlighted code line)
5. If no matching file is found:
   - Restart **Info Query Action**
   - Request user to provide correct `projectKey`, `repository`, and `at` values

## Output Format

When a source file is successfully identified and analyzed, provide the user with:

1. **Exception Method:** The name of the method that threw the exception
2. **Code Line:** The specific line of code that caused the exception (highlighted)
3. **File Location:** The full path to the source file
4. **Context:** Surrounding code lines for better understanding

## Error Handling

- If the user provides incorrect project/repository information, guide them to retry
- If the file content cannot be retrieved, inform the user and suggest alternative approaches
- If the line number in the stacktrace doesn't match the actual code, perform a broader search within the file

## Notes

- The default value for `at` parameter is "master" if not specified
- File name matching should be flexible to handle partial paths in stacktraces
- Always validate the exception line against the method name to ensure accuracy

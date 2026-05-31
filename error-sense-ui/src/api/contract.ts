/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 3.2.1263 on 2026-05-28 01:41:59.

export interface Project {
    id: number;
    key: string;
    name: string;
    description: string;
    public: boolean;
}

export interface ProjectFileStructure {
    project: Project;
    repositories: RepositoryFileStructure[];
}

export interface Repository {
    id: number;
    slug: string;
    name: string;
    description: string;
    projectKey: string;
    cloneUrl: string;
}

export interface RepositoryFile {
    path: string;
    name: string;
    size: number;
    contentId: string;
    directory: boolean;
}

export interface RepositoryFileStructure {
    repository: Repository;
    files: RepositoryFile[];
}

export interface ChatContext {
    item: ErrReportItem;
    history: MessageItem[];
}

export interface ErrReportDTO {
    errItems: ErrReportItem[];
}

export interface ErrReportItem {
    appId: string;
    commitId: string;
    repoName: string;
    branchName: string;
    id: string;
    pattern: string;
    stackTrace: string;
    appearTimes: number;
    criticalLevel: CriticalLevel;
}

export interface LoginDTO {
    auth: boolean;
    token: string;
    expiredIn: number;
}

export interface MessageItem {
    id: number;
    role: string;
    type: MessageType;
    content: string;
    timestamp: string;
}

export const enum CriticalLevel {
    NoImpact = "NoImpact",
    Low = "Low",
    High = "High",
}

export const enum MessageType {
    Instruct = "Instruct",
    Query = "Query",
    Input = "Input",
    Answer = "Answer",
}

/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 3.2.1263 on 2026-05-21 21:57:38.

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

export interface ErrReportDTO {
    errItems: ErrReportItem[];
}

export interface ErrReportItem {
    appId: string;
    commitId: string;
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
}

export const enum CriticalLevel {
    NoImpact = "NoImpact",
    Low = "Low",
    High = "High",
}

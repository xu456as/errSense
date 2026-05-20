/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 3.2.1263 on 2026-05-21 00:11:43.

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

export const enum CriticalLevel {
    NoImpact = "NoImpact",
    Low = "Low",
    High = "High",
}

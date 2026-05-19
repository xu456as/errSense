export type CriticalLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type DeveloperReportItem = {
  id: number;
  pattern: string;
  appearTimes: number;
  rootCauseAnalysis: string;
  suggestion: string;
  level: CriticalLevel;
};

export type DeveloperFilters = {
  appId: string;
  commitId: string;
  taskId: string;
};

export type ReviewerApproveStatus = 'Resolved' | 'ExistLowImpact';

export type ReviewerFilters = {
  taskId: string;
};

export type ReviewerReportItem = {
  id: number;
  pattern: string;
  lastAppearTime: string;
  ownerApprovalStatus: ReviewerApproveStatus;
  ownerExplanation: string;
  actionInHigherEnv: string;
};

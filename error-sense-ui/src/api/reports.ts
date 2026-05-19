import {
  DeveloperFilters,
  DeveloperReportItem,
  ReviewerApproveStatus,
  ReviewerFilters,
  ReviewerReportItem,
} from '../types/report';
import { apiFetch } from './client';

const MOCK_ENABLED = true;

const mockReports: DeveloperResponse = {
  errCases: [
    {
      id: 1,
      pattern: "3345",
      appearTimes: 10,
      rootCauseAnalysis: "rootCauseAnalysis",
      suggestion: "suggestion",
      level: "High"
    },
    {
      id: 2,
      pattern: "pattern",
      appearTimes: 10,
      rootCauseAnalysis: "rootCauseAnalysis",
      suggestion: "suggestion",
      level: "High"
    },
    {
      id: 3,
      pattern: "p3",
      appearTimes: 10,
      rootCauseAnalysis: "rootCauseAnalysis",
      suggestion: "suggestion",
      level: "Low"
    }
  ]
};

type DeveloperResponse = {
  errCases: DeveloperReportItem[];
};

type ReviewerResponse = {
  errCases: ReviewerReportItem[];
};

export function fetchDeveloperReports(filters: DeveloperFilters, signal?: AbortSignal): Promise<DeveloperResponse> {
  if (MOCK_ENABLED) {
    return new Promise<DeveloperResponse>(resolve => 
        setTimeout(() => resolve(mockReports), 500)
    )
  }
  return apiFetch<DeveloperResponse>('/v1/errsense/report/dev-summary', { params: filters, signal });
}

export function fetchReviewerReports(filters: ReviewerFilters, signal?: AbortSignal) {
  return apiFetch<ReviewerResponse>('/v1/errsense/report/owner-review', { params: filters, signal });
}

export function updateReviewerReport(
  id: number,
  payload: {
    ownerApprovalStatus: ReviewerApproveStatus;
    ownerExplanation: string;
    actionInHigherEnv: string;
  }
) {
  return apiFetch<ReviewerReportItem>(`/v1/errsense/report/owner-review/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

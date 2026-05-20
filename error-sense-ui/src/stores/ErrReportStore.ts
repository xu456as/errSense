import { create } from 'zustand';
import {
  DeveloperFilters,
  ReviewerReportItem,
  ReviewerFilters,
} from '../types/report';
import {
  fetchDeveloperReports,
  fetchReviewerReports,
  updateReviewerReport,
} from '../api/reports';
import { apiFetch } from '../api/client';
import { ErrReportDTO, ErrReportItem } from '../api/contract';


interface ErrReportState {
  errItems: ErrReportItem[];
}

interface ErrReportActions {
  getErrReport: (filters: DeveloperFilters) => Promise<void>;
}

const initialState: ErrReportState = {
  errItems: []
};

export const useErrReportStore = create<ErrReportState & ErrReportActions>((set, get) => ({
  ...initialState,

  getErrReport: async (filters) => {
    set({ errItems: [] });
    try {
      const response = await apiFetch<ErrReportDTO>('/api/v1/errsense/report/getErrReport', { params: filters });
      set({
        errItems: response.errItems ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load err items';
      console.error(message);
    }
  }
}));
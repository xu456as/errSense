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
import { apiFetch, apiPost } from '../api/client';
import { ChatContext, ErrReportDTO, ErrReportItem, MessageItem } from '../api/contract';


interface ErrReportState {
  errItems: ErrReportItem[];
  errItemChatMap: Record<string, ChatContext>;
}

interface ErrReportActions {
  getErrReport: (filters: DeveloperFilters) => Promise<void>;
  chat: (errItemId: string, userMessage: MessageItem) => Promise<void>;
}

const initialState: ErrReportState = {
  errItems: [],
  errItemChatMap: {}
};

export const useErrReportStore = create<ErrReportState & ErrReportActions>((set, get) => ({
  ...initialState,
  chat: async (errItemId: string, userMessage: MessageItem) => {
    console.log('chat', errItemId, userMessage);
    try {
      const { errItems, errItemChatMap } = get();
      const errReportItem = errItems.find(item => item.id === errItemId);
      if (!errReportItem) {
        console.error('ErrReportItem not found:', errItemId);
        return;
      }

      const existingChatContext = errItemChatMap[errItemId] || { item: errReportItem, history: [] };
      const updatedHistory = [...existingChatContext.history, userMessage];
      const newChatContext: ChatContext = { item: errReportItem, history: updatedHistory };
      console.log('newChatContext', newChatContext);
      const response = await apiPost<MessageItem>('/api/v1/errsense/report/chat', newChatContext);

      set(state => ({
        errItemChatMap: {
          ...state.errItemChatMap,
          [errItemId]: {
            ...newChatContext,
            history: [...newChatContext.history, response]
          }
        }
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to chat';
      console.error(message);
    }
  },
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
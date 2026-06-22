import { create } from 'zustand';

import { apiFetch, apiPost } from '../api/client';
import { AgentGraphDTO, AgentNodeDTO, ChatCaseGraphDTO } from '../api/contract';

interface AgentGraphState {
    chatCaseGraphs: ChatCaseGraphDTO[];
    chatCaseOptions: string[];
    graphList: AgentGraphDTO[];
    currentGraph: string | null;
    graphNodes: AgentNodeDTO[];
    modelOptions: string[];
    toolOptions: string[];
}

const initialState: AgentGraphState = {
  chatCaseGraphs: [],
  chatCaseOptions: [],
  graphList: [],
  currentGraph: null,
  graphNodes: [],
  modelOptions: [],
  toolOptions: []
};

interface AgentGraphAction {
    creteNewGraph: (agentGraph: AgentGraphDTO) => Promise<AgentGraphDTO>;
    deleteGraph: (id: number) => Promise<void>;
    listGraphs: () => Promise<AgentGraphDTO[]>;
    listGraphNodes: (graphName: string) => Promise<AgentNodeDTO[]>;
    deleteGraphNode: (id: number) => Promise<void>;
    addGraphNode: (node: AgentNodeDTO) => Promise<AgentNodeDTO>;
    updateGraphNode: (node: AgentNodeDTO) => Promise<AgentNodeDTO>;
    deleteEdgeInGraphNode: (graphName: string, nodeName: string, nextHopToRemove: string) => Promise<void>;
    addEdgeToGraphNode: (graphName: string, nodeName: string, nextHopToAdd: string) => Promise<void>;
    configureChatCaseGraph: (chatCase: string, graphName: string) => Promise<void>;
    listChatChaseGraphs: () => Promise<ChatCaseGraphDTO[]>;
    listChatCaseOptions: () => Promise<string[]>;
    setCurrentGraph: (graphName: string | null) => void;
    listModelOptions: () => Promise<string[]>;
    listToolOptions: () => Promise<string[]>;
}
export const useErrReportStore = create<AgentGraphState & AgentGraphAction>((set, get) => ({
  ...initialState,

  creteNewGraph: async (agentGraph) => {
    try {
      const response = await apiPost<AgentGraphDTO>('/api/graph', agentGraph);
      set(state => ({
        graphList: [...state.graphList, response]
      }));
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create graph';
      console.error(message);
      throw err;
    }
  },

  deleteGraph: async (id) => {
    try {
      await apiFetch<void>(`/api/graph/${id}`, { method: 'DELETE' });
      set(state => ({
        graphList: state.graphList.filter(g => g.id !== id)
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete graph';
      console.error(message);
    }
  },

  listGraphs: async () => {
    set({ graphList: [] });
    try {
      const response = await apiFetch<AgentGraphDTO[]>('/api/graph');
      set({ graphList: response });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list graphs';
      console.error(message);
      return [];
    }
  },

  listGraphNodes: async (graphName) => {
    set({ graphNodes: [] });
    try {
      const response = await apiFetch<AgentNodeDTO[]>(`/api/nodes/graph/${graphName}`);
      set({ graphNodes: response, currentGraph: graphName });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list graph nodes';
      console.error(message);
      return [];
    }
  },

  deleteGraphNode: async (id) => {
    try {
      await apiFetch<void>(`/api/nodes/${id}`, { method: 'DELETE' });
      set(state => ({
        graphNodes: state.graphNodes.filter(n => n.id !== id)
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete node';
      console.error(message);
    }
  },

  addGraphNode: async (node) => {
    try {
      const response = await apiPost<AgentNodeDTO>('/api/nodes', node);
      set(state => ({
        graphNodes: [...state.graphNodes, response]
      }));
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add node';
      console.error(message);
      throw err;
    }
  },

  updateGraphNode: async (node) => {
    try {
      const response = await apiFetch<AgentNodeDTO>(`/api/nodes/${node.id}`, {
        method: 'PUT',
        body: JSON.stringify(node)
      });
      set(state => ({
        graphNodes: state.graphNodes.map(n =>
          n.id === node.id ? response : n
        )
      }));
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update node';
      console.error(message);
      throw err;
    }
  },

  deleteEdgeInGraphNode: async (graphName, nodeName, nextHopToRemove) => {
    try {
      const nodes = await apiFetch<AgentNodeDTO[]>(`/api/nodes/graph/${graphName}`);
      const node = nodes.find(n => n.nodeName === nodeName);
      if (!node) {
        console.error('Node not found:', nodeName);
        return;
      }
      const nextHops = node.nextHops
        ? node.nextHops.split(',').map(h => h.trim()).filter(h => h)
        : [];
      const updatedNextHops = nextHops.filter(h => h !== nextHopToRemove).join(',');
      await apiFetch<void>(`/api/nodes/${node.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...node, nextHops: updatedNextHops })
      });
      set(state => ({
        graphNodes: state.graphNodes.map(n =>
          n.id === node.id ? { ...n, nextHops: updatedNextHops } : n
        )
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete edge';
      console.error(message);
    }
  },

  addEdgeToGraphNode: async (graphName, nodeName, nextHopToAdd) => {
    try {
      const nodes = await apiFetch<AgentNodeDTO[]>(`/api/nodes/graph/${graphName}`);
      const node = nodes.find(n => n.nodeName === nodeName);
      if (!node) {
        console.error('Node not found:', nodeName);
        return;
      }
      const nextHops = node.nextHops
        ? node.nextHops.split(',').map(h => h.trim()).filter(h => h)
        : [];
      if (!nextHops.includes(nextHopToAdd)) {
        nextHops.push(nextHopToAdd);
      }
      const updatedNextHops = nextHops.join(',');
      await apiFetch<void>(`/api/nodes/${node.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...node, nextHops: updatedNextHops })
      });
      set(state => ({
        graphNodes: state.graphNodes.map(n =>
          n.id === node.id ? { ...n, nextHops: updatedNextHops } : n
        )
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add edge';
      console.error(message);
    }
  },

  configureChatCaseGraph: async (chatCase, graphName) => {
    try {
      await apiPost<ChatCaseGraphDTO>('/api/graph/chat-case', { chatCase, graphName });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to configure chat case graph';
      console.error(message);
    }
  },

  listChatChaseGraphs: async () => {
    set({ chatCaseGraphs: [] });
    try {
      const response = await apiFetch<ChatCaseGraphDTO[]>('/api/graph/chat-case');
      set({ chatCaseGraphs: response });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list chat case graphs';
      console.error(message);
      return [];
    }
  },

  listChatCaseOptions: async () => {
    try {
      const response = await apiFetch<string[]>('/api/graph/chatCases');
      set({ chatCaseOptions: response });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list chat case options';
      console.error(message);
      return [];
    }
  },

  setCurrentGraph: (graphName) => {
    set({ currentGraph: graphName });
  },

  listModelOptions: async () => {
    try {
      const response = await apiFetch<string[]>('/api/nodes/modelOptions');
      set({ modelOptions: response });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list model options';
      console.error(message);
      return [];
    }
  },

  listToolOptions: async () => {
    try {
      const response = await apiFetch<string[]>('/api/nodes/toolOptions');
      set({ toolOptions: response });
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list tool options';
      console.error(message);
      return [];
    }
  }
}));
import EditNodeModal from './EditNodeModal';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Circle,
  Square,
  Diamond,
  Refresh,
  Delete,
  Add,
  ChevronRight,
  ChevronLeft,
} from '@mui/icons-material';
import { useErrReportStore } from '../stores/AgentGraphStore';
import { AgentGraphDTO, AgentNodeDTO } from '../api/contract';

interface GraphNode {
  id: string;
  type: 'circle' | 'square' | 'diamond' | 'double-circle';
  label: string;
  x: number;
  y: number;
  nextHops: string[];
  // Backend AgentNode fields
  backendId?: number;
  graphName?: string;
  instruction?: string;
  modelName?: string;
  agentInitParams?: string;
  tools?: string;
  nodeFlag?: number;
  status?: string;
  description?: string;
  timestamp?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface NodeMeta {
  type: GraphNode['type'];
  x: number;
  y: number;
}

const componentElements = [
  { type: 'circle', label: 'Start', icon: <Circle sx={{ width: 32, height: 32 }} /> },
  { type: 'square', label: 'Process', icon: <Square sx={{ width: 32, height: 32 }} /> },
  { type: 'diamond', label: 'Decision', icon: <Diamond sx={{ width: 32, height: 32 }} /> },
  { type: 'double-circle', label: 'End', icon: <Refresh sx={{ width: 32, height: 32 }} /> },
];

function parseNextHops(nextHops?: string): string[] {
  if (!nextHops) return [];
  return nextHops.replace(/[\[\]"]/g, '').split(',').map(h => h.trim()).filter(Boolean);
}

function layoutNodes(nodes: AgentNodeDTO[]): Record<string, NodeMeta> {
  const meta: Record<string, NodeMeta> = {};
  const VERTICAL_GAP = 200;
  const START_Y = 60;
  const START_X = 100;
  nodes.forEach((node, index) => {
    meta[node.nodeName] = {
      x: START_X,
      y: START_Y + index * VERTICAL_GAP,
      type: 'square',
    };
  });
  return meta;
}

export function AgentGraphDesigner() {
  // ── Store state ──
  const graphList = useErrReportStore(state => state.graphList);
  const graphNodes = useErrReportStore(state => state.graphNodes);
  const currentGraph = useErrReportStore(state => state.currentGraph);
  const chatCaseGraphs = useErrReportStore(state => state.chatCaseGraphs);
  const listGraphs = useErrReportStore(state => state.listGraphs);
  const listGraphNodes = useErrReportStore(state => state.listGraphNodes);
  const listChatChaseGraphs = useErrReportStore(state => state.listChatChaseGraphs);
  const addGraphNode = useErrReportStore(state => state.addGraphNode);
  const deleteGraphNode = useErrReportStore(state => state.deleteGraphNode);
  const updateGraphNode = useErrReportStore(state => state.updateGraphNode);
  const addEdgeToGraphNode = useErrReportStore(state => state.addEdgeToGraphNode);
  const deleteEdgeInGraphNode = useErrReportStore(state => state.deleteEdgeInGraphNode);
  const creteNewGraph = useErrReportStore(state => state.creteNewGraph);

  // ── Local canvas state (positions & types not stored in backend) ──
  const [nodeMeta, setNodeMeta] = useState<Record<string, NodeMeta>>({});
  const lastGraphRef = useRef<string | null>(null);

  // Initialize positions when graph changes (new nodes get default layout)
  useEffect(() => {
    if (currentGraph && currentGraph !== lastGraphRef.current) {
      lastGraphRef.current = currentGraph;
      setNodeMeta(layoutNodes(graphNodes));
    }
  }, [currentGraph, graphNodes]);

  // Load graphs on mount
  useEffect(() => {
    listGraphs();
    listChatChaseGraphs();
  }, [listGraphs, listChatChaseGraphs]);

  // ── Derive canvas nodes from store graphNodes + local nodeMeta ──
  const canvasNodes: GraphNode[] = React.useMemo(() => {
    return graphNodes.map(gn => {
      const meta = nodeMeta[gn.nodeName] || { x: 100, y: 100, type: 'square' as const };
      return {
        id: gn.nodeName,
        type: meta.type,
        label: gn.nodeName,
        x: meta.x,
        y: meta.y,
        nextHops: parseNextHops(gn.nextHops),
        backendId: gn.id,
        graphName: gn.graphName,
        instruction: gn.instruction,
        modelName: gn.modelName,
        agentInitParams: gn.agentInitParams,
        tools: gn.tools,
        nodeFlag: gn.nodeFlag,
        status: gn.status,
        description: gn.description,
        timestamp: gn.timestamp,
        createdAt: gn.createdAt,
        updatedAt: gn.updatedAt,
      };
    });
  }, [graphNodes, nodeMeta]);

  // ── Local UI state ──
  const [selectedChatCase, setSelectedChatCase] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectionSource, setConnectionSource] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [connectionTargetPos, setConnectionTargetPos] = useState({ x: 0, y: 0 });
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'error' | 'warning' | 'info' | 'success' } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<{ source: string; target: string } | null>(null);
  const [editNodeModalOpen, setEditNodeModalOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [pendingNewNode, setPendingNewNode] = useState<{
    type: GraphNode['type'];
    x: number;
    y: number;
  } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newGraphDialogOpen, setNewGraphDialogOpen] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');

  // Derive the full node data for the modal from canvasNodes
  const editingNodeData = React.useMemo(() => {
    if (!selectedNode) return null;
    return canvasNodes.find((n) => n.id === selectedNode) ?? null;
  }, [selectedNode, canvasNodes]);

  // Compute SVG content extent so drawn lines are visible after scrolling
  const svgBounds = React.useMemo(() => {
    const nodes = canvasNodes;
    if (nodes.length === 0) return { w: 800, h: 600 };
    let maxX = 0, maxY = 0;
    nodes.forEach((node) => {
      const w = node.type === 'square' ? 120 : 80;
      const h = node.type === 'square' ? 60 : 80;
      maxX = Math.max(maxX, node.x + w);
      maxY = Math.max(maxY, node.y + h);
    });
    return { w: maxX + 300, h: maxY + 300 };
  }, [canvasNodes]);

  const handleGraphSelect = useCallback((graphName: string) => {
    listGraphNodes(graphName);
    setSelectedNode(null);
  }, [listGraphNodes]);

  const handleChatCaseSelect = useCallback((chatCaseId: number) => {
    setSelectedChatCase(prev => prev === chatCaseId ? null : chatCaseId);
  }, []);

  const handleComponentDragStart = useCallback((type: string) => {
    setDraggedElement(type);
  }, []);

  const handleComponentDragEnd = useCallback(() => {
    setDraggedElement(null);
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const canvasDiv = (e.currentTarget as HTMLElement).parentElement;
    if (!canvasDiv) return;

    const canvasRect = canvasDiv.getBoundingClientRect();
    const scrollLeft = canvasDiv.scrollLeft || 0;
    const scrollTop = canvasDiv.scrollTop || 0;
    const node = canvasNodes.find((n) => n.id === nodeId);
    if (node) {
      setDraggingNode(nodeId);
      setDragOffset({
        x: e.clientX - canvasRect.left + scrollLeft - node.x,
        y: e.clientY - canvasRect.top + scrollTop - node.y,
      });
      setSelectedConnection(null);
      setSelectedNode(nodeId);
    }
  }, [canvasNodes]);

  const handleConnectionStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const canvasDiv = (e.currentTarget as HTMLElement).closest('[data-canvas]') as HTMLElement;
    if (!canvasDiv) return;

    const canvasRect = canvasDiv.getBoundingClientRect();
    const scrollLeft = canvasDiv.scrollLeft || 0;
    const scrollTop = canvasDiv.scrollTop || 0;
    const node = canvasNodes.find((n) => n.id === nodeId);
    if (!node) return;

    const center = getNodeEdgePort(node, 'bottom');
    setConnectionSource({ nodeId, x: center.x, y: center.y });
    setConnectionTargetPos({
      x: e.clientX - canvasRect.left + scrollLeft,
      y: e.clientY - canvasRect.top + scrollTop,
    });
  }, [canvasNodes]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = e.currentTarget.scrollLeft || 0;
    const scrollTop = e.currentTarget.scrollTop || 0;

    if (draggingNode) {
      const newX = e.clientX - rect.left + scrollLeft - dragOffset.x;
      const newY = e.clientY - rect.top + scrollTop - dragOffset.y;

      setNodeMeta(prev => ({
        ...prev,
        [draggingNode]: {
          ...(prev[draggingNode] || { type: 'square' }),
          x: Math.max(0, newX),
          y: Math.max(0, newY),
        },
      }));
    } else if (connectionSource) {
      setConnectionTargetPos({
        x: e.clientX - rect.left + scrollLeft,
        y: e.clientY - rect.top + scrollTop,
      });
    }
  }, [draggingNode, dragOffset, connectionSource]);

  const hasCycle = (nodes: GraphNode[], sourceId: string, targetId: string): boolean => {
    // Build adjacency list including the proposed edge
    const adj: Record<string, string[]> = {};
    nodes.forEach((n) => {
      adj[n.id] = [...n.nextHops];
    });
    adj[sourceId] = adj[sourceId] || [];
    adj[sourceId].push(targetId);

    // DFS from targetId to see if we can reach sourceId
    const visited = new Set<string>();
    const stack = [targetId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of adj[current] || []) {
        if (!visited.has(next)) {
          stack.push(next);
        }
      }
    }
    return false;
  };

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (connectionSource) {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = e.currentTarget.scrollLeft || 0;
      const scrollTop = e.currentTarget.scrollTop || 0;
      const mouseX = e.clientX - rect.left + scrollLeft;
      const mouseY = e.clientY - rect.top + scrollTop;

      // Check if mouse is over any target node
      for (const node of canvasNodes) {
        if (node.id === connectionSource.nodeId) continue;

        const w = getNodeWidth(node);
        const h = node.type === 'square' ? 60 : 80;
        if (mouseX >= node.x && mouseX <= node.x + w && mouseY >= node.y && mouseY <= node.y + h) {
          // Cycle detection: check if adding this edge would create a cycle
          if (hasCycle(canvasNodes, connectionSource.nodeId, node.id)) {
            setSnackbar({ message: 'Cannot create connection: this would create a cycle in the graph', severity: 'error' });
          } else if (currentGraph) {
            // Create connection via store action
            addEdgeToGraphNode(currentGraph, connectionSource.nodeId, node.id);
            // Optimistically update local state
            setNodeMeta(prev => prev);
          }
          break;
        }
      }

      setConnectionSource(null);
    }
    setDraggingNode(null);
  }, [connectionSource, canvasNodes, currentGraph, addEdgeToGraphNode]);

  const handleCanvasDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = e.currentTarget.scrollLeft || 0;
      const scrollTop = e.currentTarget.scrollTop || 0;
      const x = e.clientX - rect.left + scrollLeft - 40;
      const y = e.clientY - rect.top + scrollTop - 40;

      setPendingNewNode({
        type: draggedElement as GraphNode['type'],
        x: Math.max(0, x),
        y: Math.max(0, y),
      });
      setNewNodeName('');
      setDraggedElement(null);
    }
  }, [draggedElement]);

  const handleNewNodeConfirm = useCallback(async () => {
    if (!pendingNewNode || !currentGraph) return;
    const name = newNodeName.trim() || `New ${pendingNewNode.type}`;

    try {
      const newNode: AgentNodeDTO = {
        id: 0,
        graphName: currentGraph,
        nodeName: name,
        timestamp: Date.now(),
        instruction: '',
        modelName: '',
        agentInitParams: '',
        tools: '',
        nextHops: '',
        nodeFlag: 0,
        status: 'ACTIVE',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const saved = await addGraphNode(newNode);
      // Store canvas position and type locally
      setNodeMeta(prev => ({
        ...prev,
        [saved.nodeName]: {
          type: pendingNewNode.type,
          x: pendingNewNode.x,
          y: pendingNewNode.y,
        },
      }));
      setPendingNewNode(null);
      setNewNodeName('');
    } catch (err) {
      setSnackbar({ message: 'Failed to create node', severity: 'error' });
    }
  }, [pendingNewNode, currentGraph, newNodeName, addGraphNode]);

  const handleNewNodeCancel = useCallback(() => {
    setPendingNewNode(null);
    setNewNodeName('');
  }, []);

  // ── New Graph dialog ──
  const handleNewGraphOpen = useCallback(() => {
    setNewGraphName('');
    setNewGraphDialogOpen(true);
  }, []);

  const handleNewGraphConfirm = useCallback(async () => {
    const name = newGraphName.trim();
    if (!name) return;
    try {
      await creteNewGraph({
        id: 0,
        graphName: name,
        status: 'ACTIVE',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setNewGraphDialogOpen(false);
      setNewGraphName('');
      // Refresh graph list and load the new graph
      await listGraphs();
      listGraphNodes(name);
    } catch (err) {
      setSnackbar({ message: 'Failed to create graph', severity: 'error' });
    }
  }, [newGraphName, creteNewGraph, listGraphs, listGraphNodes]);

  const handleNewGraphCancel = useCallback(() => {
    setNewGraphDialogOpen(false);
    setNewGraphName('');
  }, []);

  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const deleteNode = useCallback(async (nodeId: string) => {
    const node = canvasNodes.find((n) => n.id === nodeId);
    if (node?.backendId) {
      await deleteGraphNode(node.backendId);
    }
    setNodeMeta(prev => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [canvasNodes, deleteGraphNode, selectedNode]);

  const handleConnectionClick = useCallback((sourceId: string, targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(null);
    setSelectedConnection({ source: sourceId, target: targetId });
  }, []);

  const deleteConnection = useCallback(async (sourceId: string, targetId: string) => {
    if (currentGraph) {
      await deleteEdgeInGraphNode(currentGraph, sourceId, targetId);
    }
    setSelectedConnection(null);
  }, [currentGraph, deleteEdgeInGraphNode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          deleteNode(selectedNode);
        } else if (selectedConnection) {
          deleteConnection(selectedConnection.source, selectedConnection.target);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedConnection, deleteNode, deleteConnection]);

  const getNodeWidth = (node: GraphNode): number => {
    switch (node.type) {
      case 'square': return 120;
      default: return 80;
    }
  };

  const handleCompact = useCallback(() => {
    // Apply topological layout to canvas nodes (local positions)
    const nodes = canvasNodes;
    if (nodes.length === 0) return;

    // --- 1. Kahn's algorithm for topological layering ---
    const inDegree: Record<string, number> = {};
    const children: Record<string, string[]> = {};
    const parents: Record<string, string[]> = {};
    nodes.forEach((n) => {
      inDegree[n.id] = 0;
      children[n.id] = [];
      parents[n.id] = [];
    });
    nodes.forEach((n) => {
      n.nextHops.forEach((h) => {
        if (inDegree[h] !== undefined) {
          inDegree[h]++;
          children[n.id].push(h);
          parents[h].push(n.id);
        }
      });
    });

    const level: Record<string, number> = {};
    let currentLevel = 0;
    let queue: string[] = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);

    if (queue.length === 0) {
      queue = [nodes[0].id];
    }

    while (queue.length > 0) {
      const nextQueue: string[] = [];
      for (const nodeId of queue) {
        level[nodeId] = currentLevel;
        for (const child of children[nodeId]) {
          inDegree[child]--;
          if (inDegree[child] === 0) {
            nextQueue.push(child);
          }
        }
      }
      queue = nextQueue;
      currentLevel++;
    }

    nodes.forEach((n) => {
      if (level[n.id] === undefined) {
        level[n.id] = currentLevel++;
      }
    });

    // --- 2. Group nodes by level ---
    const levelGroups: Record<number, string[]> = {};
    nodes.forEach((n) => {
      const lvl = level[n.id] ?? 0;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(n.id);
    });
    const maxLvl = Math.max(...Object.keys(levelGroups).map(Number));

    // --- 3. Barycenter ordering ---
    const nodeOrder: Record<string, number> = {};
    nodes.forEach((n, i) => { nodeOrder[n.id] = i; });

    const getLevelIndex = (lvl: number, nodeId: string): number => {
      return levelGroups[lvl].indexOf(nodeId);
    };

    // Top-down pass
    for (let lvl = 1; lvl <= maxLvl; lvl++) {
      const ids = levelGroups[lvl];
      if (ids.length <= 1) continue;
      ids.sort((a, b) => {
        const parentsA = parents[a].filter((p) => (level[p] ?? -1) === lvl - 1);
        const parentsB = parents[b].filter((p) => (level[p] ?? -1) === lvl - 1);
        const avgA = parentsA.length > 0
          ? parentsA.reduce((sum, p) => sum + getLevelIndex(lvl - 1, p), 0) / parentsA.length
          : nodeOrder[a];
        const avgB = parentsB.length > 0
          ? parentsB.reduce((sum, p) => sum + getLevelIndex(lvl - 1, p), 0) / parentsB.length
          : nodeOrder[b];
        return avgA - avgB;
      });
      levelGroups[lvl] = ids;
    }

    // Bottom-up pass
    for (let lvl = maxLvl - 1; lvl >= 0; lvl--) {
      const ids = levelGroups[lvl];
      if (ids.length <= 1) continue;
      ids.sort((a, b) => {
        const childrenA = children[a].filter((c) => (level[c] ?? -1) === lvl + 1);
        const childrenB = children[b].filter((c) => (level[c] ?? -1) === lvl + 1);
        const avgA = childrenA.length > 0
          ? childrenA.reduce((sum, c) => sum + getLevelIndex(lvl + 1, c), 0) / childrenA.length
          : nodeOrder[a];
        const avgB = childrenB.length > 0
          ? childrenB.reduce((sum, c) => sum + getLevelIndex(lvl + 1, c), 0) / childrenB.length
          : nodeOrder[b];
        return avgA - avgB;
      });
      levelGroups[lvl] = ids;
    }

    // --- 4. Assign positions ---
    const VERTICAL_GAP = 200;
    const HORIZONTAL_GAP = 150;
    const START_Y = 60;
    const START_X = 100;
    const NODE_WIDTH = 80;

    let maxNodesInLevel = 0;
    Object.values(levelGroups).forEach((g) => {
      maxNodesInLevel = Math.max(maxNodesInLevel, g.length);
    });
    const canvasWidth = maxNodesInLevel * NODE_WIDTH + (maxNodesInLevel - 1) * HORIZONTAL_GAP;

    const newMeta: Record<string, NodeMeta> = {};
    nodes.forEach((node) => {
      const lvl = level[node.id] ?? 0;
      const ids = levelGroups[lvl] || [];
      const idx = ids.indexOf(node.id);
      const levelTotalWidth = ids.length * NODE_WIDTH + (ids.length - 1) * HORIZONTAL_GAP;
      const startXForLevel = START_X + (canvasWidth - levelTotalWidth) / 2;
      const x = startXForLevel + idx * (NODE_WIDTH + HORIZONTAL_GAP);
      const y = START_Y + lvl * VERTICAL_GAP;

      newMeta[node.id] = {
        ...(nodeMeta[node.id] || { type: 'square' }),
        x: Math.max(10, x),
        y: Math.max(10, y),
      };
    });
    setNodeMeta(newMeta);
    setSelectedNode(null);
  }, [canvasNodes, nodeMeta]);

  const getNodeElement = (node: GraphNode) => {
    const isSelected = selectedNode === node.id;
    const isDragging = draggingNode === node.id;
    const baseProps = {
      onMouseDown: (e: React.MouseEvent) => handleNodeMouseDown(e, node.id),
      style: {
        position: 'absolute' as const,
        left: node.x,
        top: node.y,
        cursor: isDragging ? 'grabbing' as const : 'grab' as const,
        transition: isDragging ? 'none' as const : 'box-shadow 0.2s' as const,
        zIndex: isSelected ? 100 : 1,
      },
    };

    switch (node.type) {
      case 'circle':
        return (
          <div
            {...baseProps}
            key={node.id}
            style={{
              ...baseProps.style,
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#0b4f6c',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSelected ? '0 0 0 4px rgba(11, 79, 108, 0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Typography variant="caption" textAlign="center" sx={{ px: 1 }}>
              {node.label}
            </Typography>
            {/* Connection handle */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleConnectionStart(e, node.id);
              }}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -8,
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#0b4f6c',
                border: '2px solid white',
                cursor: 'crosshair',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
              title="Drag to create connection"
            />
          </div>
        );
      case 'square':
        return (
          <div
            {...baseProps}
            key={node.id}
            style={{
              ...baseProps.style,
              width: 120,
              height: 60,
              backgroundColor: '#ffffff',
              border: '2px solid #0b4f6c',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSelected ? '0 0 0 4px rgba(11, 79, 108, 0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Typography variant="body2" fontWeight={600} color="#102a43">
              {node.label}
            </Typography>
            {/* Connection handle */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleConnectionStart(e, node.id);
              }}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -8,
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#0b4f6c',
                border: '2px solid white',
                cursor: 'crosshair',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
              title="Drag to create connection"
            />
          </div>
        );
      case 'diamond':
        return (
          <React.Fragment key={node.id}>
            <div
              {...baseProps}
              style={{
                ...baseProps.style,
                width: 80,
                height: 80,
                backgroundColor: '#ffb703',
                transform: 'rotate(45deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected ? '0 0 0 4px rgba(255, 183, 3, 0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="#102a43"
                style={{
                  transform: 'rotate(-45deg)',
                  width: '60px',
                  textAlign: 'center',
                }}
              >
                {node.label}
              </Typography>
            </div>
            {/* Connection handle outside rotated div */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleConnectionStart(e, node.id);
              }}
              style={{
                position: 'absolute',
                left: node.x + 40 - 8,
                top: node.y + 80 - 8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#0b4f6c',
                border: '2px solid white',
                cursor: 'crosshair',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
              title="Drag to create connection"
            />
          </React.Fragment>
        );
      case 'double-circle':
        return (
          <div
            {...baseProps}
            key={node.id}
            style={{
              ...baseProps.style,
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '4px double #0b4f6c',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSelected ? '0 0 0 4px rgba(11, 79, 108, 0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Typography variant="caption" textAlign="center" fontWeight={600} color="#102a43">
              {node.label}
            </Typography>
            {/* Connection handle */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                handleConnectionStart(e, node.id);
              }}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -8,
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#0b4f6c',
                border: '2px solid white',
                cursor: 'crosshair',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
              title="Drag to create connection"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const getNodeSize = (node: GraphNode) => {
    if (node.type === 'square') return { w: 120, h: 60 };
    return { w: 80, h: 80 };
  };

  const getNodeEdgePort = (node: GraphNode, side: 'top' | 'bottom' | 'left' | 'right') => {
    const { w, h } = getNodeSize(node);
    switch (side) {
      case 'top': return { x: node.x + w / 2, y: node.y };
      case 'bottom': return { x: node.x + w / 2, y: node.y + h };
      case 'left': return { x: node.x, y: node.y + h / 2 };
      case 'right': return { x: node.x + w, y: node.y + h / 2 };
    }
  };

  const getNearestEdgeRoute = (source: GraphNode, target: GraphNode) => {
    const { w: sw, h: sh } = getNodeSize(source);
    const { w: tw, h: th } = getNodeSize(target);
    const scx = source.x + sw / 2, scy = source.y + sh / 2;
    const tcx = target.x + tw / 2, tcy = target.y + th / 2;
    const dx = tcx - scx, dy = tcy - scy;

    let exitSide: 'top' | 'bottom' | 'left' | 'right';
    let entrySide: 'top' | 'bottom' | 'left' | 'right';
    if (Math.abs(dx) >= Math.abs(dy)) {
      exitSide = dx >= 0 ? 'right' : 'left';
      entrySide = dx >= 0 ? 'left' : 'right';
    } else {
      exitSide = dy >= 0 ? 'bottom' : 'top';
      entrySide = dy >= 0 ? 'top' : 'bottom';
    }

    const exitPort = getNodeEdgePort(source, exitSide);
    const entryPort = getNodeEdgePort(target, entrySide);

    const dirs: Record<string, { x: number; y: number }> = {
      bottom: { x: 0, y: 1 }, top: { x: 0, y: -1 },
      right: { x: 1, y: 0 }, left: { x: -1, y: 0 },
    };
    const ed = dirs[exitSide];
    const end = dirs[entrySide];

    const GAP = 30;
    const p1 = { x: exitPort.x + ed.x * GAP, y: exitPort.y + ed.y * GAP };
    const p2 = { x: entryPort.x + end.x * GAP, y: entryPort.y + end.y * GAP };

    let path = `M ${exitPort.x} ${exitPort.y} L ${p1.x} ${p1.y}`;
    if (p1.x !== p2.x && p1.y !== p2.y) {
      path += ` L ${p1.x} ${p2.y}`;
    }
    path += ` L ${p2.x} ${p2.y} L ${entryPort.x} ${entryPort.y}`;

    return { path, entryPort, exitSide, entrySide };
  };

  const renderConnections = () => {
    const connections: React.ReactNode[] = [];

    canvasNodes.forEach((node) => {
      node.nextHops.forEach((nextHopId) => {
        const targetNode = canvasNodes.find((n) => n.id === nextHopId);
        if (targetNode) {
          const { path } = getNearestEdgeRoute(node, targetNode);
          const isSelected = selectedConnection?.source === node.id && selectedConnection?.target === nextHopId;

          connections.push(
            <g key={`${node.id}-${nextHopId}`}>
              {/* Invisible wider path for easier clicking */}
              <path
                d={path}
                stroke="transparent"
                strokeWidth={14}
                fill="none"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseDown={(e) => handleConnectionClick(node.id, nextHopId, e)}
              />
              {/* Visible path */}
              <path
                d={path}
                stroke={isSelected ? '#e53935' : '#0b4f6c'}
                strokeWidth={isSelected ? 3 : 2}
                fill="none"
                markerEnd="url(#arrowhead)"
                style={{ pointerEvents: 'none' }}
              />
              {/* Selection glow */}
              {isSelected && (
                <path
                  d={path}
                  stroke="#e53935"
                  strokeWidth={6}
                  fill="none"
                  opacity={0.2}
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          );
        }
      });
    });

    return connections;
  };

  // Build connection targets (labels of connected-to nodes) for the edit modal
  const connectionTargets = React.useMemo(() => {
    if (!editingNodeData) return [];
    return editingNodeData.nextHops
      .map((hopId) => {
        const hopNode = canvasNodes.find((n) => n.id === hopId);
        return hopNode?.label ?? hopId;
      });
  }, [editingNodeData, canvasNodes]);

  const handleNodeSaved = useCallback(async (updatedNode: GraphNode) => {
    // Convert GraphNode back to AgentNodeDTO for the store action
    const dto: AgentNodeDTO = {
      id: updatedNode.backendId ?? 0,
      graphName: updatedNode.graphName ?? currentGraph ?? '',
      nodeName: updatedNode.label,
      timestamp: updatedNode.timestamp ?? Date.now(),
      instruction: updatedNode.instruction ?? '',
      modelName: updatedNode.modelName ?? '',
      agentInitParams: updatedNode.agentInitParams ?? '',
      tools: updatedNode.tools ?? '',
      nextHops: updatedNode.nextHops.join(','),
      nodeFlag: updatedNode.nodeFlag ?? 0,
      status: updatedNode.status ?? 'ACTIVE',
      description: updatedNode.description ?? '',
      createdAt: updatedNode.createdAt as unknown as Date,
      updatedAt: new Date(),
    };
    await updateGraphNode(dto);
  }, [currentGraph, updateGraphNode]);

  const selectedGraphName = currentGraph ?? '';
  const selectedGraphNodeCount = canvasNodes.length;

  return (
    <>
    <div style={{ display: 'flex', height: 'calc(100vh - 180px)', gap: 12 }}>
      {/* 左侧面板 (Function List + Graph List, collapsible) */}
      <div style={{
        width: leftPanelCollapsed ? 40 : 200,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        position: 'relative' as const,
      }}>
        {leftPanelCollapsed ? (
          <Paper elevation={1} sx={{ height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1.5, backgroundColor: '#fafbfc' }}>
            <IconButton size="small" onClick={() => setLeftPanelCollapsed(false)} sx={{ color: '#0b4f6c' }}>
              <ChevronRight sx={{ fontSize: 20 }} />
            </IconButton>
          </Paper>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            {/* Chat Case Graphs */}
            <Paper elevation={1} sx={{ borderRadius: 2, backgroundColor: '#fafbfc', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f0f4f8' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 4, height: 16, bgcolor: '#0b4f6c', borderRadius: 2 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#102a43" fontSize={13}>
                    Chat Case Graphs
                  </Typography>
                </Stack>
                <IconButton size="small" onClick={() => setLeftPanelCollapsed(true)} sx={{ color: '#627d98', p: 0.5 }}>
                  <ChevronLeft sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={1.5}>
                  {chatCaseGraphs.map((cg) => (
                    <Button
                      key={cg.id}
                      variant={selectedChatCase === cg.id ? 'contained' : 'outlined'}
                      fullWidth
                      onClick={() => handleChatCaseSelect(cg.id)}
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        borderRadius: 1.5,
                        py: 1.5,
                      }}
                    >
                      <Stack spacing={0.5} sx={{ minWidth: 0, textAlign: 'left' }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {cg.graphName}
                        </Typography>
                        {cg.description && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {cg.description}
                          </Typography>
                        )}
                      </Stack>
                    </Button>
                  ))}
                  {chatCaseGraphs.length === 0 && (
                    <Typography variant="caption" color="text.disabled" textAlign="center">
                      暂无 Chat Case
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Paper>

            {/* Graph List - from store */}
            <Paper elevation={1} sx={{ borderRadius: 2, backgroundColor: '#fafbfc', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f0f4f8' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 4, height: 16, bgcolor: '#0b4f6c', borderRadius: 2 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#102a43" fontSize={13}>
                    Graph List
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
                <Stack spacing={1}>
                  {graphList.map((graph) => (
                    <Button
                      key={graph.id}
                      variant={currentGraph === graph.graphName ? 'contained' : 'outlined'}
                      fullWidth
                      onClick={() => handleGraphSelect(graph.graphName)}
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        borderRadius: 1.5,
                        py: 1.25,
                      }}
                      startIcon={
                        currentGraph === graph.graphName ? (
                          <ChevronRight sx={{ fontSize: 16 }} />
                        ) : null
                      }
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {graph.graphName}
                      </Typography>
                      {currentGraph === graph.graphName && (
                        <Chip
                          size="small"
                          label={`${selectedGraphNodeCount} nodes`}
                          sx={{ ml: 'auto', fontSize: 10 }}
                        />
                      )}
                    </Button>
                  ))}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Add sx={{ fontSize: 16 }} />}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderRadius: 1.5,
                  }}
                  onClick={handleNewGraphOpen}
                >
                  <Typography variant="body2">New Graph</Typography>
                </Button>
              </Box>
            </Paper>
          </div>
        )}
      </div>

      {/* 中间图形编辑器 */}
      <div style={{ flexGrow: 1 }}>
        <Paper
          elevation={1}
          sx={{
            height: '100%',
            p: 2,
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              px: 1.5,
              py: 1,
              bgcolor: '#f0f4f8',
              borderRadius: 1.5,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 4, height: 18, bgcolor: '#0b4f6c', borderRadius: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} color="#102a43" fontSize={14}>
                {selectedGraphName}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              {selectedNode && (
                <Tooltip title="Edit Node">
                  <IconButton size="small" color="primary" onClick={() => setEditNodeModalOpen(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Compact Layout">
                <IconButton size="small" onClick={handleCompact}>
                  <Refresh sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              {(selectedNode || selectedConnection) && (
                <Tooltip title={selectedNode ? "Delete Node" : "Delete Connection"}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (selectedNode) {
                        deleteNode(selectedNode);
                      } else if (selectedConnection) {
                        deleteConnection(selectedConnection.source, selectedConnection.target);
                      }
                    }}
                  >
                    <Delete sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Box>

          <div
            data-canvas
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
            onMouseDown={() => { setSelectedConnection(null); }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              height: 'calc(100% - 48px)',
              backgroundColor: '#fafbfc',
              borderRadius: 12,
              position: 'relative',
              overflow: 'auto',
            }}
          >
            {/* Render nodes from store-backed canvasNodes */}
            {canvasNodes.map((node) => getNodeElement(node))}

            {/* Input port handles (top of nodes) */}
            {canvasNodes.map((node) => {
              const topCX = node.x + (node.type === 'square' ? 60 : 40);
              const topCY = node.y;
              return (
                <div
                  key={`input-handle-${node.id}`}
                  style={{
                    position: 'absolute',
                    left: topCX - 5,
                    top: topCY - 5,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#e6f0fa',
                    border: '2px solid #0b4f6c',
                    zIndex: 200,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    pointerEvents: 'none',
                  }}
                />
              );
            })}

            {/* Connection endpoint dots */}
            {canvasNodes.map((node) =>
              node.nextHops.map((nextHopId) => {
                const targetNode = canvasNodes.find((n) => n.id === nextHopId);
                if (!targetNode) return null;
                const { entryPort } = getNearestEdgeRoute(node, targetNode);
                return (
                  <div
                    key={`endpoint-${node.id}-${nextHopId}`}
                    style={{
                      position: 'absolute',
                      left: entryPort.x - 4,
                      top: entryPort.y - 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#0b4f6c',
                      border: '2px solid white',
                      zIndex: 150,
                      pointerEvents: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                );
              })
            )}

            {/* SVG connections rendered behind nodes */}
            <svg
              width={svgBounds.w}
              height={svgBounds.h}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#0b4f6c" />
                </marker>
              </defs>
              {renderConnections()}
              {connectionSource && (
                <line
                  x1={connectionSource.x}
                  y1={connectionSource.y}
                  x2={connectionTargetPos.x}
                  y2={connectionTargetPos.y}
                  stroke="#0b4f6c"
                  strokeWidth={2}
                  strokeDasharray="6,3"
                />
              )}
            </svg>

            {/* Arrow indicators on top of nodes */}
            <svg
              width={svgBounds.w}
              height={svgBounds.h}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 300 }}
            >
              {canvasNodes.map((node) =>
                node.nextHops.map((nextHopId) => {
                  const targetNode = canvasNodes.find((n) => n.id === nextHopId);
                  if (!targetNode) return null;
                  const { entryPort, entrySide } = getNearestEdgeRoute(node, targetNode);
                  const { x, y } = entryPort;
                  const s = 5;
                  let points: string;
                  switch (entrySide) {
                    case 'top':
                      points = `${x},${y} ${x - s},${y - s * 1.4} ${x + s},${y - s * 1.4}`;
                      break;
                    case 'bottom':
                      points = `${x},${y} ${x - s},${y + s * 1.4} ${x + s},${y + s * 1.4}`;
                      break;
                    case 'left':
                      points = `${x},${y} ${x - s * 1.4},${y - s} ${x - s * 1.4},${y + s}`;
                      break;
                    case 'right':
                      points = `${x},${y} ${x + s * 1.4},${y - s} ${x + s * 1.4},${y + s}`;
                      break;
                    default:
                      points = `${x},${y} ${x - s},${y - s * 1.4} ${x + s},${y - s * 1.4}`;
                  }
                  return (
                    <polygon
                      key={`arrow-${node.id}-${nextHopId}`}
                      points={points}
                      fill="#0b4f6c"
                    />
                  );
                })
              )}
            </svg>

            {canvasNodes.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  No nodes yet
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Drag components from the right panel to create nodes
                </Typography>
              </div>
            )}
          </div>
        </Paper>
      </div>

      {/* 右侧组件库 */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <Paper
          elevation={1}
          sx={{
            height: '100%',
            borderRadius: 2,
            backgroundColor: '#fafbfc',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f0f4f8' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 4, height: 16, bgcolor: '#0b4f6c', borderRadius: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} color="#102a43" fontSize={13}>
                Component Elements
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={2}>
            {componentElements.map((element) => (
              <div
                key={element.type}
                draggable
                onDragStart={() => handleComponentDragStart(element.type)}
                onDragEnd={handleComponentDragEnd}
                style={{
                  cursor: 'grab',
                  padding: 12,
                  backgroundColor: 'white',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{ color: '#0b4f6c' }}>{element.icon}</div>
                <Typography variant="body2" fontWeight={500}>
                  {element.label}
                </Typography>
              </div>
            ))}
          </Stack>

          <Divider sx={{ my: 3 }} />

          {selectedNode && (
            <div>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={2}>
                Selected Node
              </Typography>
              <Paper sx={{ p: 2, borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {canvasNodes.find((n) => n.id === selectedNode)?.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  {canvasNodes.find((n) => n.id === selectedNode)?.type}
                </Typography>
              </Paper>
            </div>
          )}
          </Box>
        </Paper>
      </div>
    </div>

      <EditNodeModal
        open={editNodeModalOpen}
        node={editingNodeData}
        graphName={selectedGraphName}
        connectionTargets={connectionTargets}
        onClose={() => {
          setEditNodeModalOpen(false);
          setSelectedNode(null);
        }}
        onSaved={handleNodeSaved}
      />

      <Dialog open={newGraphDialogOpen} onClose={handleNewGraphCancel} maxWidth="xs" fullWidth>
        <DialogTitle>新建 Graph</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Graph 名称"
            placeholder="请输入 graph 名称"
            fullWidth
            variant="outlined"
            value={newGraphName}
            onChange={(e) => setNewGraphName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNewGraphConfirm();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewGraphCancel}>取消</Button>
          <Button onClick={handleNewGraphConfirm} variant="contained">确认</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingNewNode !== null} onClose={handleNewNodeCancel} maxWidth="xs" fullWidth>
        <DialogTitle>新节点名称</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="节点名称"
            placeholder={pendingNewNode ? `New ${pendingNewNode.type}` : ''}
            fullWidth
            variant="outlined"
            value={newNodeName}
            onChange={(e) => setNewNodeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNewNodeConfirm();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewNodeCancel}>取消</Button>
          <Button onClick={handleNewNodeConfirm} variant="contained">确认</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(null)} severity={snackbar?.severity || 'error'} variant="filled" sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
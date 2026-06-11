import EditNodeModal from './EditNodeModal';
import React, { useState, useCallback, useEffect } from 'react';
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
} from '@mui/icons-material';

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
  createdAt?: string;
  updatedAt?: string;
}

interface GraphData {
  id: string;
  name: string;
  nodes: GraphNode[];
}

const mockGraphs: GraphData[] = [
  {
    id: 'graph-1',
    name: 'graph-1',
    nodes: [
      { id: 'node-1', type: 'circle', label: 'Start', x: 200, y: 40, nextHops: ['node-2'] },
      { id: 'node-2', type: 'square', label: 'Process', x: 180, y: 120, nextHops: ['node-3'] },
      { id: 'node-3', type: 'diamond', label: 'Decision', x: 180, y: 220, nextHops: ['node-4', 'node-5'] },
      { id: 'node-4', type: 'square', label: 'Branch A', x: 80, y: 320, nextHops: ['node-6'] },
      { id: 'node-5', type: 'square', label: 'Branch B', x: 280, y: 320, nextHops: ['node-6'] },
      { id: 'node-6', type: 'double-circle', label: 'End', x: 180, y: 420, nextHops: [] },
    ],
  },
  {
    id: 'graph-2',
    name: 'graph-2',
    nodes: [],
  },
  {
    id: 'graph-3',
    name: 'graph-3',
    nodes: [],
  },
];

const functionList = [
  { id: 'view-source', label: 'ViewSource' },
  { id: 'confluence', label: 'Confluence' },
  { id: 'root-cause', label: 'RootCause Analysis' },
  { id: 'expert', label: 'Expert Knowledge' },
  { id: 'provide-knowledge', label: 'Provide my Knowledge' },
];

const componentElements = [
  { type: 'circle', label: '起始节点', icon: <Circle sx={{ width: 32, height: 32 }} /> },
  { type: 'square', label: '处理节点', icon: <Square sx={{ width: 32, height: 32 }} /> },
  { type: 'diamond', label: '决策节点', icon: <Diamond sx={{ width: 32, height: 32 }} /> },
  { type: 'double-circle', label: '结束节点', icon: <Refresh sx={{ width: 32, height: 32 }} /> },
];

export function AgentGraphDesigner() {
  const [selectedGraph, setSelectedGraph] = useState<GraphData>(mockGraphs[0]);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectionSource, setConnectionSource] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [connectionTargetPos, setConnectionTargetPos] = useState({ x: 0, y: 0 });
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'error' | 'warning' | 'info' | 'success' } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<{ source: string; target: string } | null>(null);
  const [editNodeModalOpen, setEditNodeModalOpen] = useState(false);
  const [pendingNewNode, setPendingNewNode] = useState<{
    type: GraphNode['type'];
    x: number;
    y: number;
  } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');

  // Derive the full node data for the modal from selectedGraph
  const editingNodeData = React.useMemo(() => {
    if (!selectedNode) return null;
    return selectedGraph.nodes.find((n) => n.id === selectedNode) ?? null;
  }, [selectedNode, selectedGraph.nodes]);

  // Compute SVG content extent so drawn lines are visible after scrolling
  const svgBounds = React.useMemo(() => {
    const nodes = selectedGraph.nodes;
    if (nodes.length === 0) return { w: 800, h: 600 };
    let maxX = 0, maxY = 0;
    nodes.forEach((node) => {
      const w = node.type === 'square' ? 120 : 80;
      const h = node.type === 'square' ? 60 : 80;
      maxX = Math.max(maxX, node.x + w);
      maxY = Math.max(maxY, node.y + h);
    });
    return { w: maxX + 300, h: maxY + 300 };
  }, [selectedGraph.nodes]);

  const handleGraphSelect = useCallback((graph: GraphData) => {
    setSelectedGraph(graph);
    setSelectedNode(null);
  }, []);

  const handleFunctionSelect = useCallback((functionId: string) => {
    setSelectedFunction(selectedFunction === functionId ? null : functionId);
  }, [selectedFunction]);

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
    const node = selectedGraph.nodes.find((n) => n.id === nodeId);
    if (node) {
      setDraggingNode(nodeId);
      setDragOffset({
        x: e.clientX - canvasRect.left + scrollLeft - node.x,
        y: e.clientY - canvasRect.top + scrollTop - node.y,
      });
      setSelectedConnection(null);
      setSelectedNode(nodeId);
    }
  }, [selectedGraph.nodes]);

  const handleConnectionStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const canvasDiv = (e.currentTarget as HTMLElement).closest('[data-canvas]') as HTMLElement;
    if (!canvasDiv) return;

    const canvasRect = canvasDiv.getBoundingClientRect();
    const scrollLeft = canvasDiv.scrollLeft || 0;
    const scrollTop = canvasDiv.scrollTop || 0;
    const node = selectedGraph.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const center = getNodeEdgePort(node, 'bottom');
    setConnectionSource({ nodeId, x: center.x, y: center.y });
    setConnectionTargetPos({
      x: e.clientX - canvasRect.left + scrollLeft,
      y: e.clientY - canvasRect.top + scrollTop,
    });
  }, [selectedGraph.nodes]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = e.currentTarget.scrollLeft || 0;
    const scrollTop = e.currentTarget.scrollTop || 0;

    if (draggingNode) {
      const newX = e.clientX - rect.left + scrollLeft - dragOffset.x;
      const newY = e.clientY - rect.top + scrollTop - dragOffset.y;

      setSelectedGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) =>
          node.id === draggingNode
            ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
            : node
        ),
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
      for (const node of selectedGraph.nodes) {
        if (node.id === connectionSource.nodeId) continue;

        const w = getNodeWidth(node);
        const h = node.type === 'square' ? 60 : 80;
        if (mouseX >= node.x && mouseX <= node.x + w && mouseY >= node.y && mouseY <= node.y + h) {
          // Cycle detection: check if adding this edge would create a cycle
          if (hasCycle(selectedGraph.nodes, connectionSource.nodeId, node.id)) {
            setSnackbar({ message: 'Cannot create connection: this would create a cycle in the graph', severity: 'error' });
          } else {
            // Create connection: add to nextHops if not already present
            setSelectedGraph((prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === connectionSource.nodeId
                  ? { ...n, nextHops: n.nextHops.includes(node.id) ? n.nextHops : [...n.nextHops, node.id] }
                  : n
            ),
            }));
          }
          break;
        }
      }

      setConnectionSource(null);
    }
    setDraggingNode(null);
  }, [connectionSource, selectedGraph.nodes]);

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

  const handleNewNodeConfirm = useCallback(() => {
    if (!pendingNewNode) return;
    const name = newNodeName.trim() || `New ${pendingNewNode.type}`;
    const newNode: GraphNode = {
      id: `node-${Date.now()}`,
      type: pendingNewNode.type,
      label: name,
      x: pendingNewNode.x,
      y: pendingNewNode.y,
      nextHops: [],
    };
    setSelectedGraph((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setPendingNewNode(null);
    setNewNodeName('');
  }, [pendingNewNode, newNodeName]);

  const handleNewNodeCancel = useCallback(() => {
    setPendingNewNode(null);
    setNewNodeName('');
  }, []);

  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setSelectedGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
    }));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const handleConnectionClick = useCallback((sourceId: string, targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(null);
    setSelectedConnection({ source: sourceId, target: targetId });
  }, []);

  const deleteConnection = useCallback((sourceId: string, targetId: string) => {
    setSelectedGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id === sourceId) {
          return { ...n, nextHops: n.nextHops.filter((h) => h !== targetId) };
        }
        return n;
      }),
    }));
    setSelectedConnection(null);
  }, []);

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
    setSelectedGraph((prev) => {
      const nodes = prev.nodes;
      if (nodes.length === 0) return prev;

      // --- 1. Kahn's algorithm for topological layering ---
      const inDegree: Record<string, number> = {};
      const children: Record<string, string[]> = {};   // node → its outgoing targets
      const parents: Record<string, string[]> = {};     // node → its incoming sources
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

      // --- 3. Barycenter ordering (top-down + bottom-up) ---
      // Assign initial order by node insertion order (stable)
      const nodeOrder: Record<string, number> = {};
      nodes.forEach((n, i) => { nodeOrder[n.id] = i; });

      // Helper: get X position of a node from the current order within its level
      const getLevelIndex = (lvl: number, nodeId: string): number => {
        return levelGroups[lvl].indexOf(nodeId);
      };

      // Top-down pass (level 1 → max)
      for (let lvl = 1; lvl <= maxLvl; lvl++) {
        const ids = levelGroups[lvl];
        if (ids.length <= 1) continue;
        // Compute barycenter for each node based on its parents in level lvl-1
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

      // Bottom-up pass (level max-1 → 0)
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

      // --- 4. Assign positions with generous spacing ---
      const VERTICAL_GAP = 200;
      const HORIZONTAL_GAP = 150;
      const START_Y = 60;
      const START_X = 100;
      const NODE_WIDTH = 80;

      // Flatten ordered node list for position assignment
      const orderedNodes: string[] = [];
      for (let lvl = 0; lvl <= maxLvl; lvl++) {
        if (levelGroups[lvl]) {
          orderedNodes.push(...levelGroups[lvl]);
        }
      }

      // Count max nodes in any level for canvas centering
      let maxNodesInLevel = 0;
      Object.values(levelGroups).forEach((g) => {
        maxNodesInLevel = Math.max(maxNodesInLevel, g.length);
      });
      const canvasWidth = maxNodesInLevel * NODE_WIDTH + (maxNodesInLevel - 1) * HORIZONTAL_GAP;

      const updatedNodes = nodes.map((node) => {
        const lvl = level[node.id] ?? 0;
        const ids = levelGroups[lvl] || [];
        const idx = ids.indexOf(node.id);

        // Center the level horizontally
        const levelTotalWidth = ids.length * NODE_WIDTH + (ids.length - 1) * HORIZONTAL_GAP;
        const startXForLevel = START_X + (canvasWidth - levelTotalWidth) / 2;

        const x = startXForLevel + idx * (NODE_WIDTH + HORIZONTAL_GAP);
        const y = START_Y + lvl * VERTICAL_GAP;

        return { ...node, x: Math.max(10, x), y: Math.max(10, y) };
      });

      return { ...prev, nodes: updatedNodes };
    });
    setSelectedNode(null);
  }, []);

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

    // Direction vectors (outward from port)
    const dirs: Record<string, { x: number; y: number }> = {
      bottom: { x: 0, y: 1 }, top: { x: 0, y: -1 },
      right: { x: 1, y: 0 }, left: { x: -1, y: 0 },
    };
    const ed = dirs[exitSide];
    const end = dirs[entrySide];

    const GAP = 30;
    const p1 = { x: exitPort.x + ed.x * GAP, y: exitPort.y + ed.y * GAP };
    const p2 = { x: entryPort.x + end.x * GAP, y: entryPort.y + end.y * GAP };

    // Build path from p1 to p2, adding a corner if needed
    let path = `M ${exitPort.x} ${exitPort.y} L ${p1.x} ${p1.y}`;
    if (p1.x !== p2.x && p1.y !== p2.y) {
      path += ` L ${p1.x} ${p2.y}`;
    }
    path += ` L ${p2.x} ${p2.y} L ${entryPort.x} ${entryPort.y}`;

    return { path, entryPort, exitSide, entrySide };
  };

  const renderConnections = () => {
    const connections: React.ReactNode[] = [];

    selectedGraph.nodes.forEach((node) => {
      node.nextHops.forEach((nextHopId) => {
        const targetNode = selectedGraph.nodes.find((n) => n.id === nextHopId);
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
        const hopNode = selectedGraph.nodes.find((n) => n.id === hopId);
        return hopNode?.label ?? hopId;
      });
  }, [editingNodeData, selectedGraph.nodes]);

  const handleNodeSaved = useCallback((updatedNode: GraphNode) => {
    setSelectedGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)),
    }));
  }, []);

  return (
    <>
    <div style={{ display: 'flex', height: 'calc(100vh - 180px)', gap: 12 }}>
      {/* 左侧功能列表 */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <Paper
          elevation={1}
          sx={{
            height: '100%',
            p: 2,
            borderRadius: 2,
            backgroundColor: '#fafbfc',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={2}>
            Function List
          </Typography>
          <Stack spacing={1.5}>
            {functionList.map((func) => (
              <Button
                key={func.id}
                variant={selectedFunction === func.id ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => handleFunctionSelect(func.id)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  py: 1.5,
                }}
              >
                <Typography variant="body2" fontWeight={600} textAlign="left">
                  {func.label}
                </Typography>
              </Button>
            ))}
          </Stack>
        </Paper>
      </div>

      {/* 中图列表 */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <Paper
          elevation={1}
          sx={{
            height: '100%',
            p: 2,
            borderRadius: 2,
            backgroundColor: '#fafbfc',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={2}>
            Graph List
          </Typography>
          <Stack spacing={1}>
            {mockGraphs.map((graph) => (
              <Button
                key={graph.id}
                variant={selectedGraph.id === graph.id ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => handleGraphSelect(graph)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  py: 1.25,
                }}
                startIcon={
                  selectedGraph.id === graph.id ? (
                    <ChevronRight sx={{ fontSize: 16 }} />
                  ) : null
                }
              >
                <Typography variant="body2" fontWeight={500}>
                  {graph.name}
                </Typography>
                {selectedGraph.id === graph.id && (
                  <Chip
                    size="small"
                    label={`${graph.nodes.length} nodes`}
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
          >
            <Typography variant="body2">New Graph</Typography>
          </Button>
        </Paper>
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
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              {selectedGraph.name}
            </Typography>
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
            {selectedGraph.nodes.map((node) => getNodeElement(node))}

            {/* Input port handles (top of nodes) */}
            {selectedGraph.nodes.map((node) => {
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
            {selectedGraph.nodes.map((node) =>
              node.nextHops.map((nextHopId) => {
                const targetNode = selectedGraph.nodes.find((n) => n.id === nextHopId);
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
              {selectedGraph.nodes.map((node) =>
                node.nextHops.map((nextHopId) => {
                  const targetNode = selectedGraph.nodes.find((n) => n.id === nextHopId);
                  if (!targetNode) return null;
                  const { entryPort, entrySide } = getNearestEdgeRoute(node, targetNode);
                  const { x, y } = entryPort;
                  const s = 5;
                  let points: string;
                  switch (entrySide) {
                    case 'top':
                      // tip at top edge, pointing down into node
                      points = `${x},${y} ${x - s},${y - s * 1.4} ${x + s},${y - s * 1.4}`;
                      break;
                    case 'bottom':
                      // tip at bottom edge, pointing up into node
                      points = `${x},${y} ${x - s},${y + s * 1.4} ${x + s},${y + s * 1.4}`;
                      break;
                    case 'left':
                      // tip at left edge, pointing right into node
                      points = `${x},${y} ${x - s * 1.4},${y - s} ${x - s * 1.4},${y + s}`;
                      break;
                    case 'right':
                      // tip at right edge, pointing left into node
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

            {selectedGraph.nodes.length === 0 && (
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
            p: 2,
            borderRadius: 2,
            backgroundColor: '#fafbfc',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={2}>
            Component Elements
          </Typography>
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
                  {selectedGraph.nodes.find((n) => n.id === selectedNode)?.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" mt={1} display="block">
                  {selectedGraph.nodes.find((n) => n.id === selectedNode)?.type}
                </Typography>
              </Paper>
            </div>
          )}
        </Paper>
      </div>
    </div>

      <EditNodeModal
        open={editNodeModalOpen}
        node={editingNodeData}
        graphName={selectedGraph.name}
        connectionTargets={connectionTargets}
        onClose={() => {
          setEditNodeModalOpen(false);
          setSelectedNode(null);
        }}
        onSaved={handleNodeSaved}
      />

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

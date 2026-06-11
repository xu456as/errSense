import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import MDEditor from '@uiw/react-md-editor';

const API_BASE = '/api/nodes';

interface GraphNode {
  id: string;
  type: 'circle' | 'square' | 'diamond' | 'double-circle';
  label: string;
  x: number;
  y: number;
  nextHops: string[];
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

interface Props {
  open: boolean;
  node: GraphNode | null;
  graphName: string;
  connectionTargets: string[]; // nodeNames of connected targets
  onClose: () => void;
  onSaved: (updatedNode: GraphNode) => void;
}

export default function EditNodeModal({ open, node, graphName, connectionTargets, onClose, onSaved }: Props) {
  const [instruction, setInstruction] = useState('');
  const [modelName, setModelName] = useState('');
  const [agentInitParams, setAgentInitParams] = useState('');
  const [tools, setTools] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Populate form when node changes
  useEffect(() => {
    if (node) {
      setInstruction(node.instruction ?? '');
      setModelName(node.modelName ?? '');
      setAgentInitParams(node.agentInitParams ?? '');
      setTools(node.tools ?? '');
      setStatus(node.status ?? 'ACTIVE');
      setDescription(node.description ?? '');
      setError(null);
      setSuccess(false);
    }
  }, [node]);

  const handleSubmit = useCallback(async () => {
    if (!node) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload = {
      graphName,
      nodeName: node.label,
      timestamp: node.timestamp ?? Date.now(),
      instruction: instruction || null,
      modelName: modelName || null,
      agentInitParams: agentInitParams || null,
      tools: tools || null,
      nextHops: connectionTargets.length > 0
        ? `["${connectionTargets.join('","')}"]`
        : null,
      nodeFlag: node.nodeFlag ?? 0,
      status: status || 'ACTIVE',
      description: description || null,
    };

    try {
      let res: Response;
      if (node.backendId) {
        // Update existing
        res = await fetch(`${API_BASE}/${node.backendId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const saved = await res.json();
      setSuccess(true);

      // Build updated node
      const updatedNode: GraphNode = {
        ...node,
        backendId: saved.id,
        graphName: saved.graphName,
        instruction: saved.instruction,
        modelName: saved.modelName,
        agentInitParams: saved.agentInitParams,
        tools: saved.tools,
        nodeFlag: saved.nodeFlag,
        status: saved.status,
        description: saved.description,
        timestamp: saved.timestamp,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };

      onSaved(updatedNode);

      // Auto close after short delay
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save node');
    } finally {
      setSaving(false);
    }
  }, [node, graphName, connectionTargets, instruction, modelName, agentInitParams, tools, status, description, onClose, onSaved]);

  const handleClose = useCallback(() => {
    if (!saving) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  }, [saving, onClose]);

  if (!open || !node) return null;

  const nextHopsDisplay = connectionTargets.length > 0
    ? connectionTargets.join(', ')
    : '(none - connect lines to other nodes)';

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 640,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
      >
        <Typography variant="h6" fontWeight={600} mb={2}>
          {node.backendId ? 'Edit Node' : 'Create Node'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Node saved successfully
          </Alert>
        )}

        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          {/* Read-only fields */}
          <Stack spacing={2}>
            <TextField
              label="Graph Name"
              value={graphName}
              size="small"
              disabled
              fullWidth
            />
            <TextField
              label="Node Name"
              value={node.label}
              size="small"
              disabled
              fullWidth
            />
            <TextField
              label="Next Hops (auto-populated from connections)"
              value={nextHopsDisplay}
              size="small"
              disabled
              fullWidth
              multiline
            />

            <Divider />

            {/* Editable fields */}
            <Typography variant="subtitle2" color="text.secondary">
              Editable Fields
            </Typography>

            <Box sx={{ '& .wmde-markdown-var': { fontFamily: 'inherit' } }}>
              <Typography variant="body2" color="text.secondary" mb={0.5}>
                Instruction (Markdown)
              </Typography>
              <MDEditor
                value={instruction}
                onChange={(val) => setInstruction(val ?? '')}
                preview="edit"
                height={250}
              />
            </Box>

            <TextField
              label="Model Name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              size="small"
              fullWidth
              placeholder="e.g. gpt-4"
            />

            <TextField
              label="Agent Init Params (JSON)"
              value={agentInitParams}
              onChange={(e) => setAgentInitParams(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder='e.g. {"temperature": 0.7}'
            />

            <TextField
              label="Tools (JSON list)"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder='e.g. ["web_search", "code_interpreter"]'
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                <MenuItem value="DRAFT">DRAFT</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </Box>

        {/* Footer */}
        <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2} pt={2} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="outlined" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving || success}>
            {saving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {node.backendId ? 'Update' : 'Create'}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}

// Need to import Divider
function Divider() {
  return <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', my: 1 }} />;
}
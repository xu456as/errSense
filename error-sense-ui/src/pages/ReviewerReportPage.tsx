import {
  Alert,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import { startTransition, useCallback, useState } from 'react';
import { fetchReviewerReports, updateReviewerReport } from '../api/reports';
import { PageHeader } from '../components/PageHeader';
import { useReportRequest } from '../hooks/useReportRequest';
import { ReviewerApproveStatus, ReviewerFilters, ReviewerReportItem } from '../types/report';
import { downloadCsv } from '../utils/export';

const statusOptions: ReviewerApproveStatus[] = ['Resolved', 'ExistLowImpact'];
const defaultFilters: ReviewerFilters = {
  taskId: '',
};

function areReviewerFiltersEqual(left: ReviewerFilters, right: ReviewerFilters) {
  return left.taskId === right.taskId;
}

export function ReviewerReportPage() {
  const [filters, setFilters] = useState<ReviewerFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<ReviewerFilters>(defaultFilters);
  const [savingId, setSavingId] = useState<number | null>(null);
  const requestReviewerReports = useCallback(
    (nextFilters: ReviewerFilters, signal: AbortSignal) =>
      fetchReviewerReports(nextFilters, signal),
    []
  );
  const { items, loading, error, setError, setItems } = useReportRequest(
    filters,
    requestReviewerReports,
    'Failed to load reviewer reports'
  );

  const handleSearch = () => {
    if (areReviewerFiltersEqual(filters, draftFilters)) {
      return;
    }

    startTransition(() => {
      setFilters(draftFilters);
    });
  };

  const handleChange = <K extends keyof ReviewerReportItem>(
    id: number,
    field: K,
    value: ReviewerReportItem[K]
  ) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async (item: ReviewerReportItem) => {
    setSavingId(item.id);

    try {
      const updated = await updateReviewerReport(item.id, {
        ownerApprovalStatus: item.ownerApprovalStatus,
        ownerExplanation: item.ownerExplanation,
        actionInHigherEnv: item.actionInHigherEnv,
      });

      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...updated, id: row.id } : row))
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save reviewer report');
    } finally {
      setSavingId(null);
    }
  };

  const handleExport = () => {
    downloadCsv(
      'reviewer-report.csv',
      [
        'No.',
        'Id',
        'Error Pattern',
        'Last Seen In UAT',
        'Owner Approve Status',
        'App Owner Explanation',
        'What to do if it happens in Prod?',
      ],
      items.map((item, index) => [
        index + 1,
        item.id,
        item.pattern,
        item.lastAppearTime,
        item.ownerApprovalStatus,
        item.ownerExplanation,
        item.actionInHigherEnv,
      ])
    );
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Reviewer Report"
        subtitle="Review the latest UAT findings, approve disposition, and capture production response guidance."
      />
      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Task Id"
            value={draftFilters.taskId}
            onChange={(event) => setDraftFilters((current) => ({ ...current, taskId: event.target.value }))}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{ minWidth: { md: 140 } }}
          >
            Search
          </Button>
          <Button variant="outlined" onClick={handleExport} sx={{ minWidth: { md: 140 } }}>
            Export CSV
          </Button>
        </Stack>
      </Paper>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No.</TableCell>
              <TableCell>Id</TableCell>
              <TableCell>Error Pattern</TableCell>
              <TableCell>Last Seen In UAT</TableCell>
              <TableCell>Owner Approve Status</TableCell>
              <TableCell>App Owner Explanation</TableCell>
              <TableCell>What to do if it happens in Prod?</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id} hover>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{item.id}</TableCell>
                <TableCell sx={{ minWidth: 220 }}>{item.pattern}</TableCell>
                <TableCell sx={{ minWidth: 140 }}>{item.lastAppearTime}</TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <TextField
                    select
                    value={item.ownerApprovalStatus}
                    onChange={(event) =>
                      handleChange(
                        item.id,
                        'ownerApprovalStatus',
                        event.target.value as ReviewerApproveStatus
                      )
                    }
                    fullWidth
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell sx={{ minWidth: 260 }}>
                  <TextField
                    value={item.ownerExplanation}
                    onChange={(event) =>
                      handleChange(item.id, 'ownerExplanation', event.target.value)
                    }
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 260 }}>
                  <TextField
                    value={item.actionInHigherEnv}
                    onChange={(event) => handleChange(item.id, 'actionInHigherEnv', event.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 120 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleSave(item)}
                    disabled={savingId === item.id}
                  >
                    {savingId === item.id ? 'Saving...' : 'Save'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>No reviewer reports available.</TableCell>
              </TableRow>
            ) : null}
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading reviewer reports...</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

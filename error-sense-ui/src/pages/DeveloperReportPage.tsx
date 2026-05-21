import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Dialog
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import GuidedChatBox from '../components/GuidedChatBox';
// import ChatBox from '../components/ChatBox';
import { startTransition, useCallback, useState } from 'react';
import { fetchDeveloperReports } from '../api/reports';
import { PageHeader } from '../components/PageHeader';
import { useReportRequest } from '../hooks/useReportRequest';
import { DeveloperFilters, DeveloperReportItem } from '../types/report';
import { downloadCsv } from '../utils/export';
import { useErrReportStore } from '../stores/ErrReportStore';
import { CriticalLevel } from '../api/contract';
import { ErrReportItem } from '../api/contract';

const defaultFilters: DeveloperFilters = {
  appId: '',
  commitId: '',
  taskId: '',
};

function areDeveloperFiltersEqual(left: DeveloperFilters, right: DeveloperFilters) {
  return (
    left.appId === right.appId &&
    left.commitId === right.commitId &&
    left.taskId === right.taskId
  );
}

function levelColor(level: CriticalLevel) {
  if (level === CriticalLevel.High) {
    return 'error';
  }
  if (level === CriticalLevel.Low) {
    return 'warning';
  }
  if (level === CriticalLevel.NoImpact) {
    return 'info';
  }
  return 'success';
}

export function DeveloperReportPage() {
  const errItems = useErrReportStore((s) => s.errItems);
  const getErrReport = useErrReportStore((s) => s.getErrReport);
  const [filters, setFilters] = useState<DeveloperFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<DeveloperFilters>(defaultFilters);

  // const requestDeveloperReports = useCallback(
  //   (nextFilters: DeveloperFilters, signal: AbortSignal) =>
  //     fetchDeveloperReports(nextFilters, signal),
  //   []
  // );
  // const { items, loading, error } = useReportRequest(
  //   filters,
  //   requestDeveloperReports,
  //   'Failed to load developer reports'
  // );

  const handleSearch = () => {
    if (areDeveloperFiltersEqual(filters, draftFilters)) {
      return;
    }

    startTransition(() => {
      setFilters(draftFilters);
      getErrReport(draftFilters);
    });
  };
  const [selectedRow, setSelectedRow] = useState<ErrReportItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // const handleExport = () => {
  //   downloadCsv(
  //     'developer-report.csv',
  //     ['No.', 'Id', 'Error Pattern', 'Appear Times', 'Root Cause Analysis', 'Suggestion', 'Critical Level'],
  //     errItems.map((item, index) => [
  //       index + 1,
  //       item.id,
  //       item.pattern,
  //       item.appearTimes,
  //       item.rootCauseAnalysis,
  //       item.suggestion,
  //       item.level,
  //     ])
  //   );
  // };

  const handleOpenChat = (row: ErrReportItem) => {
    setSelectedRow(row);
    setDialogOpen(true);
  };

  const handleCloseChat = () => {
    setDialogOpen(false);
    setSelectedRow(null);
  };
   const [chatHistories, setChatHistories] = useState<Map<string, any[]>>(new Map());
  const saveChatHistory = (rowId: string, messages: any[]) => {
    setChatHistories(prev => new Map(prev).set(rowId, messages));
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Developer Report"
        subtitle="Inspect recurring error signatures with filters for application and delivery context."
      />
      <Paper sx={{ p: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="App Id"
            value={draftFilters.appId}
            onChange={(event) => setDraftFilters((current) => ({ ...current, appId: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Commit Id"
            value={draftFilters.commitId}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, commitId: event.target.value }))
            }
            fullWidth
          />
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
          {/* <Button variant="outlined" onClick={handleExport} sx={{ minWidth: { md: 140 } }}>
            Export CSV
          </Button> */}
        </Stack>
      </Paper>
      {/* {error ? <Alert severity="error">{error}</Alert> : null} */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No.</TableCell>
              <TableCell>Id</TableCell>
              <TableCell>Error Pattern</TableCell>
              <TableCell>Appear Times</TableCell>
              <TableCell>Critical Level</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {errItems.map((item, index) => (
              <TableRow key={item.id} hover>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.pattern}</TableCell>
                <TableCell>{item.appearTimes}</TableCell>
                <TableCell>
                  <Chip
                    label={item.criticalLevel}
                    color={levelColor(item.criticalLevel)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    color="primary" 
                    onClick={() => handleOpenChat(item)}
                  >
                    <ChatIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {/* {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>No reports matched the current search conditions.</TableCell>
              </TableRow>
            ) : null}
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading developer reports...</TableCell>
              </TableRow>
            ) : null} */}
          </TableBody>
        </Table>
      </TableContainer>
      {/* 统一的 Dialog，但内容根据选中的行变化 */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseChat}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '80vh',
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        {selectedRow && (
          // <ChatBox 
          //   key={selectedRow.id} // 使用 key 确保切换行时重新挂载组件
          //   userId={selectedRow.id}
          //   userName={"Tom"}
          //   initialMessages={chatHistories.get(selectedRow.id) || []}
          //   onMessagesChange={(messages) => saveChatHistory(selectedRow.id, messages)}
          // />
          <GuidedChatBox
            errItemId={selectedRow.id}
            key={selectedRow.id}
            onMessagesChange={(messages) => saveChatHistory(selectedRow.id, messages)}
          />
        )}
      </Dialog>
    </Stack>
  );
}

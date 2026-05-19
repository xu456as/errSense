import { Box, Typography } from '@mui/material';

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography color="text.secondary">{subtitle}</Typography>
    </Box>
  );
}

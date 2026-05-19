import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#0b4f6c',
    },
    secondary: {
      main: '#ffb703',
    },
    background: {
      default: '#f4f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#102a43',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

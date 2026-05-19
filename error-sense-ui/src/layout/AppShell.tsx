import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const drawerWidth = 280;

const navItems = [
  { label: 'Developer Report', path: '/developer-report', icon: <BugReportOutlinedIcon /> },
  { label: 'Reviewer Report', path: '/reviewer-report', icon: <FactCheckOutlinedIcon /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppContext();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0b4f6c 0%, #12344d 100%)',
        color: 'white',
      }}
    >
      <Box sx={{ px: 3, py: 3 }}>
        <Typography variant="h5" sx={{ letterSpacing: 0.5 }}>
          ErrSense
        </Typography>
      </Box>
      <List sx={{ px: 1.5, flexGrow: 1 }}>
        {navItems.map((item) => {
          const selected = location.pathname === item.path;

          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                mb: 1,
                borderRadius: 3,
                color: 'inherit',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                },
                '&.Mui-selected:hover, &:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                },
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 36,
                  height: 36,
                  mr: 1.5,
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                }}
              >
                {item.icon}
              </Avatar>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={() => {
            logout();
            navigate('/login');
          }}
          sx={{ borderRadius: 3, color: 'inherit' }}
        >
          <Avatar
            variant="rounded"
            sx={{ width: 36, height: 36, mr: 1.5, bgcolor: 'rgba(255, 255, 255, 0.12)' }}
          >
            <LogoutOutlinedIcon />
          </Avatar>
          <ListItemText primary="Log out" secondary={user?.email} secondaryTypographyProps={{ color: 'rgba(255,255,255,0.72)' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(244, 247, 251, 0.8)',
          color: 'text.primary',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(16, 42, 67, 0.08)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography
            variant="h6"
            component="button"
            onClick={() => setMobileOpen((open) => !open)}
            style={{
              background: 'none',
              border: 0,
              padding: 0,
              cursor: isDesktop ? 'default' : 'pointer',
              textAlign: 'left',
            }}
          >
            Error Sense Console
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {(user?.email ?? 'E').slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={700}>
                {user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Monitoring workspace
              </Typography>
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 0,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, px: { xs: 2, md: 4 }, py: 4 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { Box, Tabs, Tab, IconButton, Tooltip } from '@mui/material';
import {
  LibraryBooks,
  Folder,
  Brightness4,
  Brightness7
} from '@mui/icons-material';
import { useTheme } from './Context/ThemeContext';
import Projects from './Projects';
import Components from './Components';
import ProjectDrawing from './ProjectDrawing';

// Separate component to handle tab navigation since we need to use hooks inside Router
const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  // Determine active tab based on current route
  const getActiveTab = () => {
    if (location.pathname === '/' || location.pathname.startsWith('/project')) {
      return 0; // Projects tab
    } else if (location.pathname === '/components') {
      return 1; // Components tab
    }
    return 0;
  };

  const handleTabChange = (event, newValue) => {
    if (newValue === 0) {
      navigate('/');
    } else if (newValue === 1) {
      navigate('/components');
    }
  };

  // Don't show tabs when in drawing mode
  const isDrawingMode = location.pathname.startsWith('/project/');

  return (
    <Box sx={{ height: '100vh' }}>
      {/* Header with Tab Navigation and Theme Toggle - Hide in drawing mode */}
      {!isDrawingMode && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pl: 2,
            pt: 1,
            pr: 2
          }}
        >
          {/* Tab Navigation */}
          <Box>
            <Tabs
              value={getActiveTab()}
              onChange={handleTabChange}
              sx={{
                minHeight: '36px',
                '& .MuiTab-root': {
                  minHeight: '36px',
                  fontSize: '0.875rem',
                  padding: '6px 12px',
                  minWidth: 'auto'
                }
              }}
            >
              <Tab
                icon={<Folder sx={{ fontSize: '1.1rem' }} />}
                label="Projects"
                iconPosition="start"
              />
              <Tab
                icon={<LibraryBooks sx={{ fontSize: '1.1rem' }} />}
                label="Components"
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Theme Toggle */}
          <Tooltip
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <IconButton onClick={toggleDarkMode} sx={{ ml: 2 }} color="inherit">
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Content Area */}
      <Box
        sx={{
          p: isDrawingMode ? 0 : 3,
          height: isDrawingMode ? '100vh' : 'calc(100vh - 120px)',
          overflow: isDrawingMode ? 'hidden' : 'auto'
        }}
      >
        <Routes>
          <Route path="/" element={<Projects />} />
          <Route path="/components" element={<Components />} />
          <Route path="/project/:projectId" element={<ProjectDrawing />} />
        </Routes>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

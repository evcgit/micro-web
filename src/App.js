import React, { useState } from 'react';
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

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { darkMode, toggleDarkMode } = useTheme();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ height: '100vh' }}>
      {/* Header with Tab Navigation and Theme Toggle */}
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
            value={activeTab}
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

      {/* Content Area */}
      <Box sx={{ p: 3, height: 'calc(100vh - 120px)', overflow: 'auto' }}>
        {activeTab === 0 && <Projects />}

        {/* Library Tab */}
        {activeTab === 1 && <Components />}
      </Box>
    </Box>
  );
}

export default App;

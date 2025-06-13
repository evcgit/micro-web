import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Fab,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip
} from '@mui/material';
import {
  Add,
  Dashboard,
  LibraryBooks,
  Edit,
  Folder,
  Image,
  ArrowBack
} from '@mui/icons-material';
import './App.css';
import DrawingTool from './DrawingTool';
import Projects from './Projects';
import Components from './Components';

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab
            icon={<Folder />}
            label="Projects"
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab
            icon={<LibraryBooks />}
            label="Component Library"
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Box>

      {/* Content Area */}
      <Box sx={{ p: 3, height: 'calc(100vh - 120px)', overflow: 'auto' }}>
        {activeTab === 0 && (
          <Projects />
        )}

        {/* Library Tab */}
        {activeTab === 1 && (
          <Components />
        )}
      </Box>
    </Box>
  );
}

export default App;

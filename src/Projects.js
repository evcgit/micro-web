import React, { useState } from 'react';
import {
  Box,
  Typography,
  Fab,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Grid
} from '@mui/material';
import { Folder, Add } from '@mui/icons-material';

const Projects = () => {
  const [newProjectDialog, setNewProjectDialog] = useState(false);
  const [projects, setProjects] = useState([]);

  const formatDate = date => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        {projects.length > 0 && (
          <Fab
            variant="extended"
            color="primary"
            onClick={() => setNewProjectDialog(true)}
            sx={{ textTransform: 'none' }}
          >
            <Add sx={{ mr: 1 }} />
            New Project
          </Fab>
        )}
      </Box>

      <Grid container spacing={3}>
        {projects.map(project => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card
              sx={{
                height: '100%',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              <CardActionArea sx={{ height: '100%', p: 0 }}>
                <CardContent
                  sx={{
                    height: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {project.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {project.description || 'No description'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Created: {formatDate(project.createdDate)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Modified: {formatDate(project.lastModified)}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {projects.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Folder sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first project to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewProjectDialog(true)}
          >
            Create Project
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Projects;

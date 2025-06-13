import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import DrawingTool from './DrawingTool';

const ProjectDrawing = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState(() => {
    // Load projects from localStorage
    const saved = localStorage.getItem('projects');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Get project from location state (for new projects) or find existing project
    if (location.state?.project) {
      setProject(location.state.project);
    } else {
      // Find project in saved projects
      const existingProject = projects.find(p => p.id.toString() === projectId);
      if (existingProject) {
        setProject(existingProject);
      } else {
        // Project not found, redirect to projects page
        navigate('/');
      }
    }
  }, [projectId, location.state, projects, navigate]);

  const saveProject = projectData => {
    const updatedProject = {
      ...project,
      ...projectData,
      lastModified: new Date().toISOString()
    };

    // Update projects list
    const updatedProjects = projects.find(p => p.id === updatedProject.id)
      ? projects.map(p => (p.id === updatedProject.id ? updatedProject : p))
      : [...projects, updatedProject];

    // Save to localStorage
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
    setProject(updatedProject);
  };

  const backToProjects = () => {
    navigate('/');
  };

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <DrawingTool
      project={project}
      onSave={saveProject}
      onBack={backToProjects}
    />
  );
};

export default ProjectDrawing;

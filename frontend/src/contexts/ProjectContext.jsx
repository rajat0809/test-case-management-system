import { createContext, useContext, useState, useCallback } from 'react';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(() => {
    const p = localStorage.getItem('currentProject');
    return p ? JSON.parse(p) : null;
  });

  const selectProject = useCallback((project) => {
    setCurrentProject(project);
    if (project) localStorage.setItem('currentProject', JSON.stringify(project));
    else localStorage.removeItem('currentProject');
  }, []);

  return (
    <ProjectContext.Provider value={{ currentProject, selectProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);

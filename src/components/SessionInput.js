import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const SessionInput = ({ inputValue, onInputChange, onBeginClick, fadeOut }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/projects`);
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data.projects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
      }
    };

    fetchProjects();
  }, []);

  const handleBeginClick = () => {
    if (!inputValue.trim()) {
      toast.error('Please enter what you want to focus on');
      return;
    }
    onBeginClick(inputValue, selectedProject);
  };

  return (
    <>
      <textarea
        value={inputValue}
        onChange={onInputChange}
        placeholder="What do you want to focus on?"
        className={`
          tw-absolute
          tw-bottom-56
          tw-left-1/2
          tw--translate-x-1/2
          tw-w-[83%]
          tw-h-32
          tw-bg-white
          tw-rounded-lg
          tw-p-4
          tw-font-sans
          tw-text-lg
          tw-text-gray-800
          tw-resize-none
          tw-outline-none
          tw-transition-all
          ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
        `}
      />

      <select
        value={selectedProject}
        onChange={(e) => setSelectedProject(e.target.value)}
        className={`
          tw-absolute
          tw-bottom-36
          tw-left-1/2
          tw--translate-x-1/2
          tw-w-[90%]
          tw-bg-gray-300
          tw-rounded-lg
          tw-p-2
          tw-font-sans
          tw-text-xs
          tw-text-gray-800
          tw-border
          tw-border-gray-300
          tw-outline-none
          tw-transition-all
          hover:tw-border-gray-400
          focus:tw-border-blue-500
          ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
        `}
      >
        <option value="">What is this for?</option>
        {projects.length === 0 ? (
          <option disabled>Add a project in the projects page or leave blank for none</option>
        ) : (
          projects.map(project => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))
        )}
      </select>

      <button
        onClick={handleBeginClick}
        className={`primary-button tw-absolute tw-bottom-12 tw-left-1/2 tw-w-[90%] tw--translate-x-1/2 ${fadeOut ? 'fadeOut' : 'opacity-100'}`}
      >
        Begin Session
      </button>
    </>
  );
};

export default SessionInput; 
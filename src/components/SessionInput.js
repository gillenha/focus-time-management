import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import CustomDropdown from './CustomDropdown';
import { authFetch } from '../utils/api';

const SessionInput = ({ inputValue, onInputChange, onBeginClick, fadeOut }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await authFetch(`${process.env.REACT_APP_API_URL}/api/projects`);
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

  const dropdownOptions = [
    { value: '', label: 'No Project' },
    ...(projects.length === 0
      ? [{ value: '_disabled', label: 'Add a project in the projects page', disabled: true }]
      : projects.map(project => ({ value: project._id, label: project.name })))
  ];

  return (
    <>
      <textarea
        value={inputValue}
        onChange={onInputChange}
        placeholder="What do you want to focus on?"
        className={`
          tw-absolute
          tw-bottom-40 sm:tw-bottom-56
          tw-left-1/2
          tw--translate-x-1/2
          tw-w-[83%]
          tw-h-20 sm:tw-h-32
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

      <div className={`
        tw-absolute
        tw-bottom-24 sm:tw-bottom-36
        tw-left-0 tw-right-0
        tw-mx-auto
        tw-w-[90%]
        tw-transition-all
        ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
      `}>
        <CustomDropdown
          value={selectedProject}
          onChange={(val) => setSelectedProject(val)}
          placeholder="What is this for?"
          options={dropdownOptions}
        />
      </div>

      <button
        onClick={handleBeginClick}
        className={`primary-button tw-absolute tw-bottom-6 sm:tw-bottom-12 tw-left-1/2 tw-w-[90%] tw--translate-x-1/2 ${fadeOut ? 'fadeOut' : 'opacity-100'}`}
      >
        Begin Session
      </button>
    </>
  );
};

export default SessionInput;

import React, { useState, useEffect } from 'react';
import { ListItemActions, EditDialog, DeleteDialog, CreateDialog } from '../components/shared';
import { toast } from 'react-toastify';
import { authFetch } from '../utils/api';

const Projects = ({ onClose, isExiting }) => {
    const [projects, setProjects] = useState([]);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);

    // Load projects from MongoDB on component mount
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

    const handleAddProject = async (formData) => {
        if (!formData.name.trim()) {
            toast.error('Please enter a project name');
            return;
        }

        const newProject = {
            name: formData.name.trim(),
            projectDetails: formData.details?.trim() || '',
            createdAt: new Date().toISOString()
        };

        try {
            const response = await authFetch(`${process.env.REACT_APP_API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newProject),
            });

            if (!response.ok) {
                throw new Error('Failed to create project');
            }

            const data = await response.json();
            setProjects(prev => [...prev, data.project]);
            setIsCreateDialogOpen(false);
            toast.success('Project created successfully');
        } catch (error) {
            console.error('Error creating project:', error);
            toast.error('Failed to create project');
        }
    };

    const handleEdit = (project) => {
        setEditingProject(project);
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingProject?.name?.trim()) {
            toast.error('Please enter a project name');
            return;
        }

        try {
            const response = await authFetch(`${process.env.REACT_APP_API_URL}/api/projects/${editingProject._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: editingProject.name.trim(),
                    projectDetails: editingProject.projectDetails?.trim() || '',
                    createdAt: editingProject.createdAt
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update project');
            }

            const data = await response.json();
            setProjects(prev => prev.map(p => 
                p._id === editingProject._id 
                    ? { ...data.project }
                    : p
            ));
            setEditingProject(null);
            setIsEditDialogOpen(false);
            toast.success('Project updated successfully');
        } catch (error) {
            console.error('Error updating project:', error);
            toast.error('Failed to update project');
        }
    };

    const handleDeleteClick = (project) => {
        setProjectToDelete(project);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        try {
            const response = await authFetch(`${process.env.REACT_APP_API_URL}/api/projects/${projectToDelete._id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete project');
            }

            setProjects(prev => prev.filter(p => p._id !== projectToDelete._id));
            setProjectToDelete(null);
            toast.success('Project deleted successfully');
        } catch (error) {
            console.error('Error deleting project:', error);
            toast.error('Failed to delete project');
        }
    };

    return (
        <div className={`tw-fixed tw-inset-0 tw-bg-white tw-z-50 ${isExiting ? 'slide-out' : 'slide-in'}`}>
            <div className="tw-h-full tw-overflow-y-auto">
                <div className="tw-p-6">
                    {/* Header with close button */}
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <div className="tw-flex tw-items-center">
                            <button 
                                onClick={onClose}
                                className="tw-appearance-none tw-bg-transparent tw-border-none tw-p-0 tw-m-0 tw-mr-4 tw-text-gray-500 tw-cursor-pointer"
                            >
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    width="24" 
                                    height="24" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                    className="tw-w-6 tw-h-6"
                                >
                                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Projects</h2>
                        </div>
                    </div>

                    {/* Projects Content */}
                    <div className="tw-space-y-6">
                        <div>
                            <h3 className="tw-text-lg tw-font-semibold tw-mb-4 tw-text-gray-700">My Projects</h3>
                            <div className="tw-max-w-lg tw-mx-auto">
                                {/* Add Project Button */}
                                <div className="tw-mb-8">
                                    <button
                                        onClick={() => setIsCreateDialogOpen(true)}
                                        className="primary-button tw-w-full"
                                    >
                                        Add New Project
                                    </button>
                                </div>

                                {/* Create Dialog */}
                                <CreateDialog
                                    isOpen={isCreateDialogOpen}
                                    onClose={() => setIsCreateDialogOpen(false)}
                                    onSubmit={handleAddProject}
                                    title="Add New Project"
                                    fields={[
                                        {
                                            name: 'name',
                                            label: 'Project Name',
                                            type: 'text',
                                            placeholder: 'Enter project name...',
                                            required: true
                                        },
                                        {
                                            name: 'details',
                                            label: 'Project Details',
                                            type: 'textarea',
                                            placeholder: 'Enter project details...',
                                            required: false
                                        }
                                    ]}
                                    submitButtonText="Add Project"
                                    darkMode={false}
                                />

                                {/* Projects List */}
                                <div className="tw-space-y-4">
                                    {projects.length === 0 ? (
                                        <p className="tw-text-gray-500 tw-text-center">No projects yet. Start creating your first project!</p>
                                    ) : (
                                        projects.map((project) => (
                                            <div 
                                                key={project._id}
                                                className="tw-group tw-relative tw-bg-gray-50 tw-rounded-lg tw-p-4 hover:tw-bg-gray-100"
                                            >
                                                <div className="tw-flex tw-justify-between tw-items-start">
                                                    <div className="tw-flex-1">
                                                        <h4 className="tw-font-medium tw-text-gray-900">{project.name}</h4>
                                                        {project.projectDetails && (
                                                            <p className="tw-text-sm tw-text-gray-600 tw-mt-1 tw-mb-2">
                                                                {project.projectDetails}
                                                            </p>
                                                        )}
                                                        <p className="tw-text-sm tw-text-gray-500">
                                                            Created: {new Date(project.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <ListItemActions
                                                        onEdit={() => handleEdit(project)}
                                                        onDelete={() => handleDeleteClick(project)}
                                                        className="tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity"
                                                        editIcon={
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-text-gray-500 hover:tw-text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        }
                                                        deleteIcon={
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-text-gray-500 hover:tw-text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Edit Dialog */}
                    <EditDialog
                        isOpen={isEditDialogOpen}
                        onClose={() => {
                            setIsEditDialogOpen(false);
                            setEditingProject(null);
                        }}
                        onConfirm={handleSaveEdit}
                        title="Edit Project"
                        darkMode={false}
                        fields={[
                            {
                                id: 'name',
                                label: 'Project Name',
                                type: 'text',
                                value: editingProject?.name || '',
                                onChange: (value) => setEditingProject(prev => ({ ...prev, name: value })),
                                placeholder: 'Enter project name...',
                                required: true
                            },
                            {
                                id: 'projectDetails',
                                label: 'Project Details',
                                type: 'textarea',
                                value: editingProject?.projectDetails || '',
                                onChange: (value) => setEditingProject(prev => ({ ...prev, projectDetails: value })),
                                placeholder: 'Enter project details...',
                                required: false
                            }
                        ]}
                    />

                    {/* Delete Dialog */}
                    <DeleteDialog
                        isOpen={isDeleteDialogOpen}
                        onClose={() => {
                            setIsDeleteDialogOpen(false);
                            setProjectToDelete(null);
                        }}
                        onConfirm={handleDelete}
                        title="Delete Project"
                        message={projectToDelete ? `Are you sure you want to delete the project "${projectToDelete.name}"?` : ''}
                    />
                </div>
            </div>
        </div>
    );
};

export default Projects; 
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ListItemActions, EditDialog, DeleteDialog } from './shared';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const SessionHistory = forwardRef(({ onClose, onSessionsUpdate }, ref) => {
    const [sessionHistory, setSessionHistory] = useState([]);
    const [editingSession, setEditingSession] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false);
    const [editingFields, setEditingFields] = useState({
        text: '',
        date: '',
        time: '',
        duration: ''
    });

    const fetchSessions = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions`);
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }
            const data = await response.json();
            setSessionHistory(data);
            onSessionsUpdate?.(data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Failed to load sessions');
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    // Update editingFields when editingSession changes
    useEffect(() => {
        if (editingSession) {
            setEditingFields({
                text: editingSession.text || '',
                date: new Date(editingSession.date).toISOString().split('T')[0],
                time: editingSession.time || '',
                duration: editingSession.duration || ''
            });
        }
    }, [editingSession]);

    // Expose fetchSessions to parent component
    useImperativeHandle(ref, () => ({
        fetchSessions
    }));

    const formatDuration = (duration) => {
        const [minutes, seconds] = duration.split(':').map(Number);
        const totalMinutes = minutes + (seconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = Math.floor(totalMinutes % 60);
        const remainingSeconds = Math.round((totalMinutes % 1) * 60);

        if (hours > 0) {
            return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return duration;
        }
    };

    const handleClearHistoryClick = () => {
        setIsClearHistoryDialogOpen(true);
    };

    const clearHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions/clear`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to clear sessions');
            }
            
            setSessionHistory([]);
            toast.success('Session history cleared');
        } catch (error) {
            console.error('Error clearing sessions:', error);
            toast.error('Failed to clear sessions');
        }
    };

    const handleEdit = (session) => {
        setEditingSession(session);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (session) => {
        setSessionToDelete(session);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!sessionToDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionToDelete._id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete session');
            }

            setSessionHistory(prev => prev.filter(session => session._id !== sessionToDelete._id));
            toast.success('Session deleted successfully');
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        } finally {
            setSessionToDelete(null);
        }
    };

    // Add duration validation helper
    const validateDuration = (duration) => {
        // Accept formats: MM:SS or HH:MM:SS
        const durationRegex = /^(?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d)$/;
        return durationRegex.test(duration);
    };

    // Add duration formatting helper
    const formatDurationInput = (input) => {
        // Remove non-numeric characters
        const numbers = input.replace(/[^\d]/g, '');
        
        if (numbers.length <= 2) {
            // Just seconds
            return numbers;
        } else if (numbers.length <= 4) {
            // MM:SS
            return `${numbers.slice(0, -2)}:${numbers.slice(-2)}`;
        } else {
            // HH:MM:SS
            return `${numbers.slice(0, -4)}:${numbers.slice(-4, -2)}:${numbers.slice(-2)}`;
        }
    };

    const handleDurationChange = (value) => {
        // Format the duration as the user types
        const formattedDuration = formatDurationInput(value);
        setEditingFields(prev => ({ ...prev, duration: formattedDuration }));
    };

    const handleSaveEdit = async () => {
        if (!editingSession) return;

        // Validate duration before saving
        if (!validateDuration(editingFields.duration)) {
            toast.error('Please enter a valid duration (MM:SS or HH:MM:SS)');
            return;
        }

        try {
            const updatedSession = {
                ...editingSession,
                text: editingFields.text.trim(),
                date: new Date(editingFields.date).toISOString(),
                time: editingFields.time,
                duration: editingFields.duration
            };

            const response = await fetch(`${API_BASE_URL}/api/sessions/${editingSession._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedSession),
            });

            if (!response.ok) {
                throw new Error('Failed to update session');
            }

            const updatedSessions = sessionHistory.map(session =>
                session._id === editingSession._id ? updatedSession : session
            );
            setSessionHistory(updatedSessions);
            toast.success('Session updated successfully');
            setIsEditDialogOpen(false);  // Close the dialog
            setEditingSession(null);     // Clear the editing session
            setEditingFields({           // Reset the fields
                text: '',
                date: '',
                time: '',
                duration: ''
            });
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error('Failed to update session');
        }
    };

    return (
        <div className="tw-fixed tw-inset-0 tw-bg-white tw-z-50">
            <div className="tw-h-full tw-overflow-y-auto">
                <div className="tw-p-6">
                    {/* Header */}
                    <div className="tw-flex tw-items-center tw-mb-6">
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
                        <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Session History</h2>
                    </div>

                    {/* Edit Dialog */}
                    <EditDialog
                        isOpen={isEditDialogOpen}
                        onClose={() => {
                            setIsEditDialogOpen(false);
                            setEditingSession(null);
                            setEditingFields({
                                text: '',
                                date: '',
                                time: '',
                                duration: ''
                            });
                        }}
                        onConfirm={handleSaveEdit}
                        title="Edit Session"
                        fields={[
                            {
                                id: 'date',
                                label: 'Date',
                                type: 'date',
                                value: editingFields.date,
                                onChange: (value) => setEditingFields(prev => ({ ...prev, date: value })),
                                required: true
                            },
                            {
                                id: 'time',
                                label: 'Time',
                                type: 'time',
                                value: editingFields.time,
                                onChange: (value) => setEditingFields(prev => ({ ...prev, time: value })),
                                required: true
                            },
                            {
                                id: 'duration',
                                label: 'Duration (MM:SS or HH:MM:SS)',
                                type: 'text',
                                value: editingFields.duration,
                                onChange: handleDurationChange,
                                placeholder: '00:00',
                                required: true
                            },
                            {
                                id: 'notes',
                                label: 'Session Notes',
                                type: 'textarea',
                                value: editingFields.text,
                                onChange: (value) => setEditingFields(prev => ({ ...prev, text: value })),
                                placeholder: 'Enter session notes...'
                            }
                        ]}
                    />

                    {/* Delete Dialog */}
                    <DeleteDialog
                        isOpen={isDeleteDialogOpen}
                        onClose={() => {
                            setIsDeleteDialogOpen(false);
                            setSessionToDelete(null);
                        }}
                        onConfirm={handleDelete}
                        title="Delete Session"
                        message={sessionToDelete ? `Are you sure you want to delete this session from ${new Date(sessionToDelete.date).toLocaleDateString()}?` : ''}
                    />

                    {/* Clear History Dialog */}
                    <DeleteDialog
                        isOpen={isClearHistoryDialogOpen}
                        onClose={() => setIsClearHistoryDialogOpen(false)}
                        onConfirm={clearHistory}
                        title="Clear All Session History"
                        message="Are you sure you want to clear all session history? This action cannot be undone."
                    />

                    {/* Session List */}
                    <div className="tw-mb-20">
                        <ul className="tw-list-none tw-p-0 tw-m-0 tw-space-y-4">
                            {sessionHistory.map((session) => (
                                <li key={session._id} 
                                    className="tw-group tw-relative tw-bg-gray-50 tw-rounded-lg tw-p-4 hover:tw-bg-gray-100"
                                >
                                    <div className="tw-flex tw-justify-between tw-items-start">
                                        <div className="tw-flex tw-gap-8">
                                            {/* Left Column - Date, Time, Duration */}
                                            <div className="tw-space-y-2">
                                                <div className="tw-flex tw-items-center">
                                                    <span className="tw-text-sm tw-text-gray-500">Date: </span>
                                                    <span className="tw-font-medium tw-ml-1">
                                                        {new Date(session.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="tw-flex tw-items-center">
                                                    <span className="tw-text-sm tw-text-gray-500">Time: </span>
                                                    <span className="tw-font-medium tw-ml-1">{session.time}</span>
                                                </div>
                                                <div className="tw-flex tw-items-center">
                                                    <span className="tw-text-sm tw-text-gray-500">Duration: </span>
                                                    <span className="tw-font-medium tw-ml-1">{formatDuration(session.duration)}</span>
                                                </div>
                                                {session.project && (
                                                    <div className="tw-flex tw-items-center">
                                                        <span className="tw-text-sm tw-text-gray-500">Project: </span>
                                                        <span className="tw-font-medium tw-ml-1">{session.project.name}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Column - Notes */}
                                            <div className="tw-flex tw-flex-col tw-items-start">
                                                <span className="tw-text-sm tw-text-gray-500">Notes: </span>
                                                <span className="tw-font-medium tw-mt-1">{session.text}</span>
                                            </div>
                                        </div>

                                        <ListItemActions
                                            onEdit={() => handleEdit(session)}
                                            onDelete={() => handleDeleteClick(session)}
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
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Footer Actions - Now fixed at bottom */}
                    <div className="tw-fixed tw-bottom-0 tw-left-0 tw-right-0 tw-bg-white tw-p-4 tw-border-t tw-border-gray-200">
                        <div className="tw-flex tw-justify-end tw-space-x-3">
                            <button
                                onClick={handleClearHistoryClick}
                                className="danger-button tw-fixed tw-bottom-4 tw-right-8 tw-w-36"
                            >
                                Clear History
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

SessionHistory.defaultProps = {
    onSessionsUpdate: () => {} // Default no-op function
};

export default SessionHistory;
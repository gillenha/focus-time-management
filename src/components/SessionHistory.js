import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { ListItemActions, EditDialog, DeleteDialog, DurationInput } from './shared';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';

const SessionHistory = forwardRef(({ onClose, onSessionsUpdate, isExiting }, ref) => {
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
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [durationError, setDurationError] = useState('');
    const [dateError, setDateError] = useState('');
    const [timeError, setTimeError] = useState('');
    const [createFields, setCreateFields] = useState({
        text: '',
        date: '',
        time: '',
        duration: '00:00:00'
    });
    const [createDateError, setCreateDateError] = useState('');
    const [createTimeError, setCreateTimeError] = useState('');
    const [createDurationError, setCreateDurationError] = useState('');
    const fileInputRef = useRef(null);

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
                date: editingSession.date.split('T')[0],
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
        if (!duration || duration === '00:00:00') {
            return 'Please enter a valid duration';
        }
        
        const [hours, minutes, seconds] = duration.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            return 'Invalid duration format';
        }
        
        if (hours === 0 && minutes === 0 && seconds === 0) {
            return 'Duration cannot be zero';
        }
        
        return '';
    };

    const handleSaveEdit = async () => {
        if (!editingSession) return;

        // Validate all fields
        let hasErrors = false;

        // Validate date
        if (!editingFields.date) {
            setDateError('Date is required');
            hasErrors = true;
        } else if (isNaN(new Date(editingFields.date).getTime())) {
            setDateError('Invalid date');
            hasErrors = true;
        } else {
            setDateError('');
        }

        // Validate time
        if (!editingFields.time) {
            setTimeError('Time is required');
            hasErrors = true;
        } else if (!/^\d{1,2}:\d{2}$/.test(editingFields.time)) {
            setTimeError('Invalid time format');
            hasErrors = true;
        } else {
            setTimeError('');
        }

        // Validate duration
        const durationValidationError = validateDuration(editingFields.duration);
        if (durationValidationError) {
            setDurationError(durationValidationError);
            hasErrors = true;
        } else {
            setDurationError('');
        }

        if (hasErrors) {
            return;
        }

        try {
            const updatedData = {
                text: editingFields.text.trim(),
                date: editingFields.date,
                time: editingFields.time,
                duration: editingFields.duration
            };

            const response = await fetch(`${API_BASE_URL}/api/sessions/${editingSession._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update session');
            }

            const savedSession = await response.json();
            const updatedSessions = sessionHistory.map(session =>
                session._id === editingSession._id ? savedSession : session
            );
            setSessionHistory(updatedSessions);
            toast.success('Session updated successfully');
            setIsEditDialogOpen(false);
            setEditingSession(null);
            setEditingFields({ text: '', date: '', time: '', duration: '' });
            setDateError('');
            setTimeError('');
            setDurationError('');
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error(error.message || 'Failed to update session');
        }
    };

    const handleExport = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions`);
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }
            const sessions = await response.json();
            
            const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `sessions_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Sessions exported successfully');
        } catch (error) {
            console.error('Error exporting sessions:', error);
            toast.error('Failed to export sessions');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            toast.error('Please select a JSON file');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const result = e.target?.result;
                    if (typeof result !== 'string') return;
                    
                    const sessions = JSON.parse(result);
                    
                    const response = await fetch(`${API_BASE_URL}/api/sessions/restore`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(sessions),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to restore sessions');
                    }

                    const data = await response.json();
                    toast.success(`Successfully restored ${data.count} sessions`);
                    
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }

                    fetchSessions();
                } catch (error) {
                    console.error('Error parsing or restoring sessions:', error);
                    toast.error('Failed to restore sessions. Please check the file format.');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error reading file:', error);
            toast.error('Failed to read the file');
        }
    };

    const handleSaveCreate = async () => {
        let hasErrors = false;

        if (!createFields.date) {
            setCreateDateError('Date is required');
            hasErrors = true;
        } else if (isNaN(new Date(createFields.date).getTime())) {
            setCreateDateError('Invalid date');
            hasErrors = true;
        } else {
            setCreateDateError('');
        }

        if (!createFields.time) {
            setCreateTimeError('Time is required');
            hasErrors = true;
        } else if (!/^\d{1,2}:\d{2}$/.test(createFields.time)) {
            setCreateTimeError('Invalid time format');
            hasErrors = true;
        } else {
            setCreateTimeError('');
        }

        const durationValidationError = validateDuration(createFields.duration);
        if (durationValidationError) {
            setCreateDurationError(durationValidationError);
            hasErrors = true;
        } else {
            setCreateDurationError('');
        }

        if (hasErrors) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: createFields.text.trim(),
                    date: createFields.date,
                    time: createFields.time,
                    duration: createFields.duration,
                    project: null
                }),
            });

            if (!response.ok) throw new Error('Failed to create session');

            fetchSessions();
            setShowCreateDialog(false);
            toast.success('Session created successfully');
        } catch (error) {
            console.error('Error creating session:', error);
            toast.error('Failed to create session');
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
                            setDateError('');
                            setTimeError('');
                            setDurationError('');
                        }}
                        onConfirm={handleSaveEdit}
                        title="Edit Session"
                        fields={[
                            {
                                id: 'date',
                                label: 'Date',
                                type: 'date',
                                value: editingFields.date,
                                onChange: (value) => {
                                    setEditingFields(prev => ({ ...prev, date: value }));
                                    if (value) setDateError('');
                                },
                                required: true,
                                error: dateError
                            },
                            {
                                id: 'time',
                                label: 'Time',
                                type: 'time',
                                value: editingFields.time,
                                onChange: (value) => {
                                    setEditingFields(prev => ({ ...prev, time: value }));
                                    if (value) setTimeError('');
                                },
                                required: true,
                                error: timeError
                            },
                            {
                                id: 'duration',
                                label: 'Duration',
                                type: 'custom',
                                value: editingFields.duration,
                                onChange: (value) => {
                                    setEditingFields(prev => ({ ...prev, duration: value }));
                                    setDurationError(validateDuration(value));
                                },
                                renderInput: ({ value, onChange, error }) => (
                                    <DurationInput
                                        value={value}
                                        onChange={onChange}
                                        error={error}
                                    />
                                ),
                                required: true,
                                error: durationError
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
                        message={sessionToDelete ? `Are you sure you want to delete this session from ${sessionToDelete.date.split('T')[0]}?` : ''}
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
                            {[...sessionHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).map((session) => (
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
                                                        {(() => {
                                                            const d = session.date;
                                                            // Date-only strings (YYYY-MM-DD) parse as UTC — force local
                                                            if (d && !d.includes('T')) {
                                                                const [y, m, day] = d.split('-').map(Number);
                                                                return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                            }
                                                            return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                                        })()}
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
                        <div className="tw-flex tw-justify-between tw-items-center">
                            <div className="tw-flex tw-items-center tw-gap-4">
                                <button
                                    onClick={handleExport}
                                    className="tw-p-2 tw-rounded-lg tw-bg-gray-100 hover:tw-bg-gray-200 tw-transition-colors"
                                    title="Export Sessions"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="tw-h-5 tw-w-5 tw-text-gray-600"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleImportClick}
                                    className="tw-p-2 tw-rounded-lg tw-bg-gray-100 hover:tw-bg-gray-200 tw-transition-colors"
                                    title="Import Sessions"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="tw-h-5 tw-w-5 tw-text-gray-600"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileSelect}
                                    className="tw-hidden"
                                />
                            </div>
                            <div className="tw-flex tw-items-center tw-gap-4">
                                <button
                                    onClick={() => {
                                        setCreateFields({
                                            text: '',
                                            date: new Date().toISOString().split('T')[0],
                                            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                                            duration: '00:00:00'
                                        });
                                        setCreateDateError('');
                                        setCreateTimeError('');
                                        setCreateDurationError('');
                                        setShowCreateDialog(true);
                                    }}
                                    className="primary-button tw-h-10 tw-w-36 tw-flex tw-items-center tw-justify-center tw-text-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="tw-h-4 tw-w-4 tw-mr-2"
                                        viewBox="0 0 20 15"
                                        fill="currentColor"
                                    >
                                        <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Add Session
                                </button>
                                <button
                                    onClick={handleClearHistoryClick}
                                    className="danger-button tw-h-10 tw-w-36 tw-flex tw-items-center tw-justify-center tw-text-sm"
                                >
                                    Clear History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <EditDialog
                isOpen={showCreateDialog}
                onClose={() => {
                    setShowCreateDialog(false);
                    setCreateFields({ text: '', date: '', time: '', duration: '00:00:00' });
                    setCreateDateError('');
                    setCreateTimeError('');
                    setCreateDurationError('');
                }}
                onConfirm={handleSaveCreate}
                title="Add New Session"
                confirmButtonText="Create"
                fields={[
                    {
                        id: 'date',
                        label: 'Date',
                        type: 'date',
                        value: createFields.date,
                        onChange: (value) => {
                            setCreateFields(prev => ({ ...prev, date: value }));
                            if (value) setCreateDateError('');
                        },
                        required: true,
                        error: createDateError
                    },
                    {
                        id: 'time',
                        label: 'Time',
                        type: 'time',
                        value: createFields.time,
                        onChange: (value) => {
                            setCreateFields(prev => ({ ...prev, time: value }));
                            if (value) setCreateTimeError('');
                        },
                        required: true,
                        error: createTimeError
                    },
                    {
                        id: 'duration',
                        label: 'Duration',
                        type: 'custom',
                        value: createFields.duration,
                        onChange: (value) => {
                            setCreateFields(prev => ({ ...prev, duration: value }));
                            setCreateDurationError(validateDuration(value));
                        },
                        renderInput: ({ value, onChange, error }) => (
                            <DurationInput
                                value={value}
                                onChange={onChange}
                                error={error}
                            />
                        ),
                        required: true,
                        error: createDurationError
                    },
                    {
                        id: 'notes',
                        label: 'Session Notes',
                        type: 'textarea',
                        value: createFields.text,
                        onChange: (value) => setCreateFields(prev => ({ ...prev, text: value })),
                        placeholder: 'Enter session notes...'
                    }
                ]}
            />
        </div>
    );
});

SessionHistory.defaultProps = {
    onSessionsUpdate: () => {} // Default no-op function
};

export default SessionHistory;
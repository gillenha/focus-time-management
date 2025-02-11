import React, { useState, useEffect } from 'react';
import { ListItemActions } from './shared';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const SessionHistory = ({ onClose }) => {
    const [sessionHistory, setSessionHistory] = useState([]);
    const [editingSession, setEditingSession] = useState(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions`);
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }
            const data = await response.json();
            setSessionHistory(data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('Failed to load sessions');
        }
    };

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
        setEditText(session.text);
    };

    const handleDelete = async (sessionId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete session');
            }

            setSessionHistory(prev => prev.filter(session => session._id !== sessionId));
            toast.success('Session deleted successfully');
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingSession) return;

        try {
            const updatedSession = {
                ...editingSession,
                text: editText.trim()
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
                session._id === editingSession._id ? { ...session, text: editText.trim() } : session
            );
            setSessionHistory(updatedSessions);
            setEditingSession(null);
            setEditText('');
            toast.success('Session updated successfully');
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

                    {/* Edit Form */}
                    {editingSession && (
                        <div className="tw-mb-6 tw-p-4 tw-bg-gray-50 tw-rounded-lg">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="tw-w-full tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-2"
                                rows="3"
                            />
                            <div className="tw-flex tw-justify-end tw-gap-2">
                                <button
                                    onClick={() => {
                                        setEditingSession(null);
                                        setEditText('');
                                    }}
                                    className="secondary-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="primary-button"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

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
                                            </div>

                                            {/* Right Column - Notes */}
                                            <div className="tw-flex tw-flex-col tw-items-start">
                                                <span className="tw-text-sm tw-text-gray-500">Notes: </span>
                                                <span className="tw-font-medium tw-mt-1">{session.text}</span>
                                            </div>
                                        </div>

                                        <ListItemActions
                                            onEdit={() => handleEdit(session)}
                                            onDelete={() => handleDelete(session._id)}
                                            deleteConfirmTitle="Delete Session"
                                            deleteConfirmMessage={`Are you sure you want to delete this session from ${new Date(session.date).toLocaleDateString()}?`}
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
                                onClick={clearHistory}
                                className="primary-button tw-fixed tw-bottom-4 tw-right-8 tw-w-36"
                            >
                                Clear History
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionHistory;
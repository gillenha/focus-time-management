import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const SessionHistory = ({ sessionHistory, onClearHistory, onClose }) => {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editText, setEditText] = useState('');

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

    const sendToServer = async (session) => {
        try {
            console.log('API_BASE_URL:', API_BASE_URL);
            console.log('Session data being sent:', JSON.stringify(session, null, 2));

            // Send to your existing server
            const serverResponse = await fetch(`${API_BASE_URL}/api/log-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(session),
            });
            
            if (!serverResponse.ok) {
                const errorData = await serverResponse.json();
                console.error('Server error response:', errorData);
                throw new Error(`Failed to log session to server: ${JSON.stringify(errorData)}`);
            }

            // Send to Notion
            const notionResponse = await fetch(`${API_BASE_URL}/api/notion-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    properties: {
                        Date: {
                            type: "date",
                            date: {
                                start: new Date().toISOString()
                            }
                        },
                        Time: {
                            type: "rich_text",
                            rich_text: [{
                                type: "text",
                                text: { content: session.time }
                            }]
                        },
                        Duration: {
                            type: "rich_text",
                            rich_text: [{
                                type: "text",
                                text: { content: session.duration }
                            }]
                        },
                        Notes: {
                            type: "rich_text",
                            rich_text: [{
                                type: "text",
                                text: { content: session.text }
                            }]
                        }
                    }
                }),
            });

            if (!notionResponse.ok) {
                const notionError = await notionResponse.json();
                console.error('Notion error details:', notionError);
                throw new Error(`Failed to log session to Notion: ${JSON.stringify(notionError)}`);
            }

            const result = await serverResponse.json();
            console.log('Server response:', result);

        } catch (error) {
            console.error('Error logging session:', error);
        }
    };

    const startEditing = (index, text) => {
        setEditingIndex(index);
        setEditText(text);
    };

    const saveEdit = (index) => {
        // Here you would typically update the sessionHistory state in the parent component
        console.log(`Saving edit for session ${index}: ${editText}`);
        setEditingIndex(null);
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

                    {/* Session List */}
                    <div className="tw-mb-20">
                        <ul className="tw-list-none tw-p-0 tw-m-0 tw-space-y-4">
                            {sessionHistory.slice().reverse().map((session, index) => {
                                const reverseIndex = sessionHistory.length - 1 - index;
                                return (
                                    <li key={`session-${reverseIndex}`} 
                                        onClick={() => console.log('Session clicked:', session)}
                                        className="tw-bg-gray-50 tw-rounded-lg tw-p-4 tw-cursor-pointer hover:tw-bg-gray-100"
                                    >
                                        <div className="tw-flex tw-gap-8">
                                            {/* Left Column - Date, Time, Duration */}
                                            <div className="tw-space-y-2">
                                                <div className="tw-flex tw-items-center">
                                                    <span className="tw-text-sm tw-text-gray-500">Date: </span>
                                                    <span className="tw-font-medium tw-ml-1">{session.date}</span>
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

                                        <div className="tw-flex tw-gap-2 tw-mt-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    sendToServer(session);
                                                }}
                                                className="btn-secondary"
                                            >
                                                Log to Server
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Footer Actions - Now fixed at bottom */}
                    <div className="tw-fixed tw-bottom-0 tw-left-0 tw-right-0 tw-bg-white tw-p-4 tw-border-t tw-border-gray-200">
                        <div className="tw-flex tw-justify-end tw-space-x-3">
                            <button
                                onClick={onClearHistory}
                                className="btn-danger"
                            >
                                Clear History
                            </button>
                            <button
                                onClick={() => console.log("Data sent to Notion")}
                                className="btn-secondary"
                            >
                                Send to Notion
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionHistory;
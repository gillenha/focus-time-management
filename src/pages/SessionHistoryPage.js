import React, { useRef } from 'react';
import './SessionHistoryPage.css';
import SessionHistory from '../components/SessionHistory';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function SessionHistoryPage({ onClose, isExiting }) {
  const fileInputRef = useRef(null);
  const sessionHistoryRef = useRef(null);

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const sessions = await response.json();
      
      // Create a blob with the sessions data
      const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `sessions_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
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
          
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          // Refresh the sessions list
          if (sessionHistoryRef.current) {
            await sessionHistoryRef.current.fetchSessions();
          }
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

  return (
    <div className="session-history-page">
      {/* Header Actions */}
      <div className="tw-fixed tw-top-6 tw-right-6 tw-flex tw-items-center tw-gap-4 tw-z-[60]">
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
        
        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="tw-hidden"
        />
      </div>

      <SessionHistory
        onClose={onClose}
        isExiting={isExiting}
        ref={sessionHistoryRef}
      />
    </div>
  );
}

export default SessionHistoryPage;

import React, { useRef, useState } from 'react';
import './SessionHistoryPage.css';
import SessionHistory from '../components/SessionHistory';
import { CreateDialog } from '../components/shared';
import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Format duration input to HH:MM:SS format
const formatDurationInput = (input, showError) => {
  // If input is empty or not a string, show error
  if (!input || typeof input !== 'string') {
    showError();
    return '00:00:00';
  }

  // Remove non-numeric characters
  let numbers = input.replace(/\D/g, '');
  
  // If no valid numbers entered, show error
  if (numbers.length === 0) {
    showError();
    return '00:00:00';
  }
  
  // Pad with leading zeros if less than 6 digits
  numbers = numbers.padStart(6, '0');
  
  // Take only the last 6 digits if longer
  numbers = numbers.slice(-6);
  
  // Split into hours, minutes, seconds
  let hours = parseInt(numbers.slice(0, 2));
  let minutes = parseInt(numbers.slice(2, 4));
  let seconds = parseInt(numbers.slice(4, 6));
  
  // Check if any values are NaN
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    showError();
    return '00:00:00';
  }
  
  // Cap values at their maximums
  hours = Math.min(hours, 59);
  minutes = Math.min(minutes, 59);
  seconds = Math.min(seconds, 59);
  
  // Format with leading zeros
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');
  
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

function SessionHistoryPage({ onClose, isExiting }) {
  const fileInputRef = useRef(null);
  const sessionHistoryRef = useRef(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [durationValue, setDurationValue] = useState('00:00:00');
  const [durationError, setDurationError] = useState('');

  const handleExport = async () => {
    try {
      // Fetch sessions with populated project data
      const response = await fetch(`${API_BASE_URL}/api/sessions`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const sessions = await response.json();
      
      // Create a blob with the sessions data (including project information)
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
          
          // Send sessions with project data to restore endpoint
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

  const handleDurationChange = (value) => {
    const showError = () => {
      toast.error('Please enter a valid time');
      setDurationError('Please enter a valid time');
    };
    const formatted = formatDurationInput(value, showError);
    setDurationValue(formatted);
    setDurationError(validateDuration(formatted));
    return formatted;
  };

  const handleCreateSession = async (formData) => {
    const durationValidationError = validateDuration(formData.duration);
    if (durationValidationError) {
      toast.error(durationValidationError);
      return;
    }

    try {
      // Create a date object in local timezone
      const [year, month, day] = formData.date.split('-').map(Number);
      const dateInLocalTimezone = new Date(year, month - 1, day);
      
      const response = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formData.notes?.trim() || '',
          date: dateInLocalTimezone.toISOString(),
          time: formData.time,
          duration: formData.duration,
          project: formData.project || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      // Refresh the sessions list
      if (sessionHistoryRef.current) {
        await sessionHistoryRef.current.fetchSessions();
      }

      setIsCreateDialogOpen(false);
      setDurationValue('00:00:00');
      setDurationError('');
      toast.success('Session created successfully');
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  return (
    <div className="session-history-page">
      {/* Header Actions */}
      <div className="tw-fixed tw-top-6 tw-right-6 tw-flex tw-items-center tw-gap-4 tw-z-[60]">
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="primary-button tw-flex tw-items-center tw-text-sm tw-p-2 tw-rounded-lg tw-bg-gray-700 hover:tw-bg-gray-600 tw-transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="tw-h-5 tw-w-5 tw-mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          New Session
        </button>
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

      <CreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setDurationValue('00:00:00');
          setDurationError('');
        }}
        onSubmit={handleCreateSession}
        title="Add New Session"
        fields={[
          {
            name: 'date',
            label: 'Date',
            type: 'date',
            required: true,
            value: new Date().toISOString().split('T')[0]
          },
          {
            name: 'time',
            label: 'Time',
            type: 'time',
            required: true,
            value: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
          },
          {
            name: 'duration',
            label: 'Duration (HH:MM:SS)',
            type: 'text',
            placeholder: '00:00:00',
            required: true,
            value: durationValue,
            onChange: handleDurationChange,
            error: durationError
          },
          {
            name: 'notes',
            label: 'Session Notes',
            type: 'textarea',
            placeholder: 'Enter session notes...',
            required: false
          }
        ]}
        submitButtonText="Create"
      />
    </div>
  );
}

export default SessionHistoryPage;

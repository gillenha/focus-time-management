import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const EditDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    session,
    dialogTitle = "Edit Session Notes",
    textareaLabel = "Session Notes",
    textareaPlaceholder = "Enter session notes...",
    inputLabel = "",
    inputPlaceholder = "",
    saveButtonText = "Save Changes",
    darkMode = false,
    showAttributionField = false
}) => {
    const [editText, setEditText] = useState(session?.text || '');
    const [attribution, setAttribution] = useState(session?.author || '');

    // Reset text when session changes
    useEffect(() => {
        setEditText(session?.text || '');
        setAttribution(session?.author || '');
    }, [session]);

    if (!isOpen) return null;

    const baseClasses = darkMode ? {
        overlay: "tw-fixed tw-inset-0 tw-bg-black/90 tw-backdrop-blur-lg tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-gray-900 tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-white",
        label: "tw-block tw-text-sm tw-font-medium tw-text-white/80 tw-mb-2",
        textarea: "tw-w-[95%] tw-p-3 tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-text-white tw-mb-4 tw-min-h-[100px] tw-resize-none focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30",
        input: "tw-w-[95%] tw-p-3 tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-text-white tw-mb-4 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button tw-text-white tw-p-2 tw-w-24",
        saveButton: "primary-button tw-p-2 tw-w-24 tw-text-sm"
    } : {
        overlay: "tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-white tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-gray-900",
        label: "tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2",
        textarea: "tw-w-full tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-4 tw-min-h-[100px]",
        input: "tw-w-full tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-4",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button",
        saveButton: "primary-button"
    };

    return (
        <div className={baseClasses.overlay}>
            <div className={baseClasses.dialog}>
                <h2 className={baseClasses.title}>{dialogTitle}</h2>
                <div className="tw-mb-6">
                    <label className={baseClasses.label}>
                        {session?.date ? `Session from ${new Date(session.date).toLocaleDateString()}` : textareaLabel}
                    </label>
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={baseClasses.textarea}
                        placeholder={textareaPlaceholder}
                    />
                    {showAttributionField && (
                        <>
                            <label className={baseClasses.label}>
                                {inputLabel}
                            </label>
                            <input
                                type="text"
                                value={attribution}
                                onChange={(e) => setAttribution(e.target.value)}
                                className={baseClasses.input}
                                placeholder={inputPlaceholder}
                            />
                        </>
                    )}
                </div>
                
                <div className={baseClasses.buttonContainer}>
                    <button
                        onClick={onClose}
                        className={baseClasses.cancelButton}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(editText, attribution);
                            onClose();
                        }}
                        className={baseClasses.saveButton}
                    >
                        {saveButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

EditDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    session: PropTypes.shape({
        _id: PropTypes.string,
        date: PropTypes.string,
        text: PropTypes.string,
        author: PropTypes.string,
    }),
    dialogTitle: PropTypes.string,
    textareaLabel: PropTypes.string,
    textareaPlaceholder: PropTypes.string,
    inputLabel: PropTypes.string,
    inputPlaceholder: PropTypes.string,
    saveButtonText: PropTypes.string,
    darkMode: PropTypes.bool,
    showAttributionField: PropTypes.bool
};

export default EditDialog; 
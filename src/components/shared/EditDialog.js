import React from 'react';
import PropTypes from 'prop-types';

const EditDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    title,
    content,
    darkMode = false,
    confirmButtonText = "Save",
    showCancelButton = true,
    fields = []
}) => {
    if (!isOpen) return null;

    const baseClasses = darkMode ? {
        overlay: "tw-fixed tw-inset-0 tw-bg-black/90 tw-backdrop-blur-lg tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-gray-900 tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-white",
        label: "tw-block tw-text-sm tw-font-medium tw-text-white/80 tw-mb-2",
        input: "tw-w-[95%] tw-p-3 tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-text-white tw-mb-4 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30",
        textarea: "tw-w-[95%] tw-p-3 tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-text-white tw-mb-4 tw-min-h-[100px] tw-resize-none focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button tw-text-white tw-p-2 tw-w-24",
        confirmButton: "primary-button tw-p-2 tw-w-24 tw-text-sm"
    } : {
        overlay: "tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-white tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-gray-900",
        label: "tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2",
        input: "tw-w-[95%] tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-4",
        textarea: "tw-w-[95%] tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-4 tw-min-h-[100px]",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button",
        confirmButton: "primary-button"
    };

    return (
        <div className={baseClasses.overlay}>
            <div className={baseClasses.dialog}>
                <h2 className={baseClasses.title}>{title}</h2>
                <div className="tw-mb-6">
                    {content || (
                        <div className="tw-space-y-4">
                            {fields.map((field) => (
                                <div key={field.id} className="tw-flex tw-flex-col tw-space-y-1">
                                    <label className={baseClasses.label}>
                                        {field.label}
                                        {!field.required && <span className="tw-text-gray-500"> (Optional)</span>}
                                    </label>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            placeholder={field.placeholder}
                                            required={field.required}
                                            className={baseClasses.textarea}
                                        />
                                    ) : (
                                        <input
                                            type={field.type || 'text'}
                                            value={field.value}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            placeholder={field.placeholder}
                                            required={field.required}
                                            className={baseClasses.input}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className={baseClasses.buttonContainer}>
                    {showCancelButton && (
                        <button
                            onClick={onClose}
                            className={baseClasses.cancelButton}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`${baseClasses.confirmButton} tw-w-24 tw-text-sm tw-p-2`}
                    >
                        {confirmButtonText}
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
    title: PropTypes.string.isRequired,
    content: PropTypes.node,
    darkMode: PropTypes.bool,
    confirmButtonText: PropTypes.string,
    showCancelButton: PropTypes.bool,
    fields: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string,
        value: PropTypes.string,
        onChange: PropTypes.func.isRequired,
        placeholder: PropTypes.string,
        required: PropTypes.bool
    }))
};

export default EditDialog; 
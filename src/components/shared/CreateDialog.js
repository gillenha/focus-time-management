import React, { useState } from 'react';
import PropTypes from 'prop-types';

const CreateDialog = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    title,
    fields,
    submitButtonText = 'Create',
    darkMode = false,
    showCancelButton = true
}) => {
    const [formData, setFormData] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Collect all form data, including controlled input values
        const submissionData = fields.reduce((data, field) => {
            // Use field.value if it exists (for controlled inputs), otherwise use formData
            data[field.name] = field.value || formData[field.name] || '';
            return data;
        }, {});

        await onSubmit(submissionData);
        setFormData({});
    };

    const handleInputChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    if (!isOpen) return null;

    const baseClasses = darkMode ? {
        overlay: "tw-fixed tw-inset-0 tw-bg-black/90 tw-backdrop-blur-lg tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-gray-900 tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-white",
        label: "tw-block tw-text-sm tw-font-medium tw-text-white/80 tw-mb-2",
        input: "tw-w-[95%] tw-p-3 tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-text-white tw-mb-1 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30",
        textarea: "tw-w-[95%] tw-p-3 tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-text-white tw-mb-1 tw-min-h-[100px] tw-resize-none focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button tw-text-white tw-p-2 tw-w-24",
        submitButton: "primary-button tw-p-2 tw-w-24 tw-text-sm",
        errorText: "tw-text-red-400 tw-text-sm tw-mt-1 tw-mb-2"
    } : {
        overlay: "tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50",
        dialog: "tw-bg-white tw-rounded-lg tw-p-6 tw-max-w-sm tw-w-full tw-mx-4",
        title: "tw-text-xl tw-font-bold tw-mb-4 tw-text-gray-900",
        label: "tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2",
        input: "tw-w-[95%] tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-1",
        textarea: "tw-w-[95%] tw-p-2 tw-border tw-border-gray-300 tw-rounded tw-mb-1 tw-min-h-[100px]",
        buttonContainer: "tw-flex tw-justify-end tw-space-x-4",
        cancelButton: "secondary-button",
        submitButton: "primary-button",
        errorText: "tw-text-red-500 tw-text-sm tw-mt-1 tw-mb-2"
    };

    return (
        <div className={baseClasses.overlay}>
            <div className={baseClasses.dialog}>
                <h2 className={baseClasses.title}>{title}</h2>
                <form onSubmit={handleSubmit} className="tw-space-y-4">
                    {fields.map((field) => (
                        <div key={field.name} className="tw-flex tw-flex-col">
                            <label className={baseClasses.label}>
                                {field.label}
                                {!field.required && <span className="tw-text-gray-500"> (Optional)</span>}
                            </label>
                            {field.type === 'custom' && field.renderInput ? (
                                field.renderInput({ value: field.value || formData[field.name] || '', onChange: (val) => {
                                    if (field.onChange) {
                                        field.onChange(val);
                                    }
                                    handleInputChange(field.name, val);
                                }, error: field.error })
                            ) : field.type === 'select' ? (
                                <select
                                    value={field.value || formData[field.name] || ''}
                                    onChange={(e) => {
                                        if (field.onChange) {
                                            field.onChange(e.target.value);
                                        }
                                        handleInputChange(field.name, e.target.value);
                                    }}
                                    className={`${baseClasses.input} ${field.error ? 'tw-border-red-500 focus:tw-border-red-500 focus:tw-ring-red-500' : ''}`}
                                >
                                    {field.options?.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : field.type === 'textarea' ? (
                                <textarea
                                    value={field.value || formData[field.name] || ''}
                                    onChange={(e) => {
                                        if (field.onChange) {
                                            const result = field.onChange(e.target.value);
                                            handleInputChange(field.name, result || e.target.value);
                                        } else {
                                            handleInputChange(field.name, e.target.value);
                                        }
                                    }}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className={`${baseClasses.textarea} ${field.error ? 'tw-border-red-500 focus:tw-border-red-500 focus:tw-ring-red-500' : ''}`}
                                />
                            ) : (
                                <input
                                    type={field.type || 'text'}
                                    value={field.value || formData[field.name] || ''}
                                    onChange={(e) => {
                                        if (field.onChange) {
                                            const result = field.onChange(e.target.value);
                                            handleInputChange(field.name, result || e.target.value);
                                        } else {
                                            handleInputChange(field.name, e.target.value);
                                        }
                                    }}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className={`${baseClasses.input} ${field.error ? 'tw-border-red-500 focus:tw-border-red-500 focus:tw-ring-red-500' : ''}`}
                                />
                            )}
                            {field.error && (
                                <span className={baseClasses.errorText}>{field.error}</span>
                            )}
                        </div>
                    ))}
                    <div className={baseClasses.buttonContainer}>
                        {showCancelButton && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({});
                                    onClose();
                                }}
                                className={baseClasses.cancelButton}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            className={`${baseClasses.submitButton} tw-w-24 tw-text-sm tw-p-2`}
                        >
                            {submitButtonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

CreateDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    fields: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string,
        placeholder: PropTypes.string,
        required: PropTypes.bool,
        value: PropTypes.string,
        onChange: PropTypes.func,
        error: PropTypes.string
    })).isRequired,
    submitButtonText: PropTypes.string,
    darkMode: PropTypes.bool,
    showCancelButton: PropTypes.bool
};

export default CreateDialog; 
import React, { useState } from 'react';

const CreateDialog = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    title,
    fields,
    submitButtonText = 'Create'
}) => {
    const [formData, setFormData] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(formData);
        setFormData({});
    };

    const handleInputChange = (fieldName, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="tw-fixed tw-inset-0 tw-bg-black/90 tw-backdrop-blur-lg tw-z-50 tw-flex tw-items-center tw-justify-center">
            <div className="tw-bg-gray-900 tw-rounded-lg tw-p-6 tw-w-full tw-max-w-sm tw-mx-auto">
                <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
                    <h2 className="tw-text-xl tw-font-bold tw-text-white">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="tw-bg-transparent tw-border-none tw-text-white/70 hover:tw-text-white tw-cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-6 tw-w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="tw-space-y-4">
                    {fields.map((field) => (
                        <div key={field.name} className="tw-flex tw-flex-col tw-space-y-1">
                            <label className="tw-text-sm tw-font-medium tw-text-white/80">
                                {field.label}
                                {!field.required && <span className="tw-text-white/50"> (Optional)</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="tw-block tw-w-auto tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-px-4 tw-py-3 tw-text-white tw-shadow-sm tw-transition-all hover:tw-border-white/20 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 tw-resize-none tw-overflow-y-auto tw-h-32 placeholder:tw-text-white/30"
                                />
                            ) : (
                                <input
                                    type={field.type || 'text'}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    className="tw-block tw-w-auto tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-px-4 tw-py-3 tw-text-white tw-shadow-sm tw-transition-all hover:tw-border-white/20 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30"
                                />
                            )}
                        </div>
                    ))}
                    <button
                        type="submit"
                        className="primary-button tw-w-full"
                    >
                        {submitButtonText}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateDialog; 
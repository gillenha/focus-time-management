import React, { useState, useEffect } from 'react';
import { fetchQuotes, addQuote, deleteQuote } from '../services/quotesService';
import { toast } from 'react-toastify';
import { ListItemActions, CreateDialog, EditDialog, DeleteDialog } from '../components/shared';

const QuoteList = ({ onClose, isExiting }) => {
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showQuotes, setShowQuotes] = useState(false);
    const [editingQuote, setEditingQuote] = useState(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [quoteToDelete, setQuoteToDelete] = useState(null);
    const [editingFields, setEditingFields] = useState({
        text: '',
        author: ''
    });

    useEffect(() => {
        loadQuotes();
    }, []);

    useEffect(() => {
        if (editingQuote) {
            setEditingFields({
                text: editingQuote.text || '',
                author: editingQuote.author || ''
            });
        }
    }, [editingQuote]);

    const loadQuotes = async () => {
        try {
            setIsLoading(true);
            const fetchedQuotes = await fetchQuotes();
            setQuotes(fetchedQuotes || []);
        } catch (error) {
            toast.error('Failed to load quotes');
            console.error('Error loading quotes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateQuote = async (formData) => {
        try {
            const formattedQuote = {
                text: formData.text.trim(),
                author: formData.author.trim() || 'Unknown'
            };
            const updatedQuotes = await addQuote(formattedQuote);
            setQuotes(updatedQuotes);
            setShowCreateDialog(false);
            toast.success('Quote added successfully');
        } catch (error) {
            toast.error('Failed to add quote');
            console.error('Error:', error);
        }
    };

    const handleEdit = (quote) => {
        setEditingQuote(quote);
        setShowEditDialog(true);
    };

    const handleUpdateQuote = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/quotes/${editingQuote._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...editingQuote,
                    text: editingFields.text.trim(),
                    author: editingFields.author?.trim() || 'Unknown'
                }),
            });
            
            if (!response.ok) throw new Error('Failed to update quote');
            
            const updatedQuotes = quotes.map(q => 
                q._id === editingQuote._id 
                    ? { ...q, text: editingFields.text.trim(), author: editingFields.author?.trim() || 'Unknown' } 
                    : q
            );
            setQuotes(updatedQuotes);
            setShowEditDialog(false);
            setEditingQuote(null);
            setEditingFields({ text: '', author: '' });
            toast.success('Quote updated successfully');
        } catch (error) {
            toast.error('Failed to update quote');
            console.error('Error:', error);
        }
    };

    const handleDeleteClick = (quote) => {
        setQuoteToDelete(quote);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!quoteToDelete) return;
        
        try {
            const updatedQuotes = await deleteQuote(quoteToDelete._id);
            setQuotes(updatedQuotes);
            setShowDeleteDialog(false);
            setQuoteToDelete(null);
            toast.success('Quote removed successfully');
        } catch (error) {
            toast.error('Failed to remove quote');
            console.error('Error removing quote:', error);
        }
    };

    const quoteFields = [
        {
            name: 'text',
            label: 'Quote Text',
            type: 'textarea',
            placeholder: 'Enter an inspiring focus quote...',
            required: true
        },
        {
            name: 'author',
            label: 'Attribution',
            type: 'text',
            placeholder: "Enter the quote's author...",
            required: false
        }
    ];

    return (
        <div className={`tw-fixed tw-inset-0 tw-bg-black/90 tw-backdrop-blur-lg tw-z-50 ${isExiting ? 'tw-animate-slideOut' : 'tw-animate-slideIn'}`}>
            <div className="tw-h-full tw-overflow-y-scroll tw-text-white">
                <div className="tw-p-6">
                    {/* Header with close button */}
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <div className="tw-flex tw-items-center">
                            <button 
                                onClick={onClose}
                                className="tw-appearance-none tw-bg-transparent tw-border-none tw-p-0 tw-m-0 tw-mr-4 tw-text-white/70 hover:tw-text-white tw-cursor-pointer tw-transition-colors"
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
                            <h2 className="tw-text-xl tw-font-bold tw-text-white">Quote List</h2>
                        </div>
                    </div>

                    {/* Quote Management Section */}
                    <div className="tw-space-y-6">
                        <div>
                            <h3 className="tw-text-lg tw-font-semibold tw-mb-4 tw-text-white/90">Focus Quotes</h3>
                            
                            {/* Add New Quote Button */}
                            <div className="tw-max-w-sm tw-mx-auto tw-mb-8">
                                <button
                                    onClick={() => setShowCreateDialog(true)}
                                    className="primary-button tw-w-full"
                                >
                                    Add New Quote
                                </button>
                            </div>

                            {/* Create Dialog */}
                            <CreateDialog
                                isOpen={showCreateDialog}
                                onClose={() => setShowCreateDialog(false)}
                                onSubmit={handleCreateQuote}
                                title="Add New Quote"
                                fields={quoteFields}
                                submitButtonText="Add Quote"
                            />

                            {/* Edit Dialog */}
                            <EditDialog
                                isOpen={showEditDialog}
                                onClose={() => {
                                    setShowEditDialog(false);
                                    setEditingQuote(null);
                                    setEditingFields({ text: '', author: '' });
                                }}
                                onConfirm={handleUpdateQuote}
                                title="Edit Quote"
                                darkMode={true}
                                fields={[
                                    {
                                        id: 'text',
                                        label: 'Quote Text',
                                        type: 'textarea',
                                        value: editingFields.text,
                                        onChange: (value) => setEditingFields(prev => ({ ...prev, text: value })),
                                        placeholder: 'Enter an inspiring focus quote...',
                                        required: true
                                    },
                                    {
                                        id: 'author',
                                        label: 'Attribution',
                                        type: 'text',
                                        value: editingFields.author,
                                        onChange: (value) => setEditingFields(prev => ({ ...prev, author: value })),
                                        placeholder: "Enter the quote's author...",
                                        required: false
                                    }
                                ]}
                            />

                            {/* Delete Dialog */}
                            <DeleteDialog
                                isOpen={showDeleteDialog}
                                onClose={() => {
                                    setShowDeleteDialog(false);
                                    setQuoteToDelete(null);
                                }}
                                onConfirm={handleConfirmDelete}
                                title="Delete Quote"
                                message={`Are you sure you want to delete this quote: "${quoteToDelete?.text}"?`}
                                confirmButtonText="Delete"
                                darkMode={true}
                            />

                            {/* Collapsible Quote List */}
                            <div className="tw-mb-4 tw-flex tw-justify-center">
                                <button
                                    onClick={() => setShowQuotes(!showQuotes)}
                                    className="tw-flex tw-items-center tw-text-lg tw-font-semibold tw-text-white/90 hover:tw-text-white tw-cursor-pointer tw-transition-colors tw-bg-transparent tw-border-0 tw-appearance-none"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`tw-h-5 tw-w-5 tw-mr-2 tw-transition-transform tw-duration-200 ${showQuotes ? 'tw-rotate-90' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    {showQuotes ? 'Hide Quotes' : 'See Quotes'}
                                </button>
                            </div>

                            {/* Quote List with fade animation */}
                            <div className={`tw-space-y-3 tw-transition-opacity tw-duration-300 ${showQuotes ? 'tw-opacity-100' : 'tw-opacity-0 tw-h-0 tw-overflow-hidden'}`}>
                                {isLoading ? (
                                    <div className="tw-flex tw-justify-center tw-py-8">
                                        <div className="tw-animate-spin tw-rounded-full tw-h-8 tw-w-8 tw-border-2 tw-border-blue-500 tw-border-t-transparent"></div>
                                    </div>
                                ) : quotes.length === 0 ? (
                                    <p className="tw-text-center tw-text-white/50 tw-italic tw-py-8">No quotes available.</p>
                                ) : (
                                    quotes.map((quote) => (
                                        <div 
                                            key={quote._id} 
                                            className="tw-group tw-relative tw-p-4 tw-transition-all tw-max-w-sm tw-mx-auto tw-bg-white/5 tw-rounded-lg hover:tw-bg-white/10"
                                        >
                                            <div className="tw-flex tw-justify-between tw-items-start">
                                                <p className="tw-text-white/90 tw-text-base tw-leading-relaxed tw-break-words tw-pr-8">
                                                    "{quote.text}"
                                                    {quote.author && quote.author !== 'Unknown' && (
                                                        <span className="tw-text-white/70 tw-ml-1">- {quote.author}</span>
                                                    )}
                                                </p>
                                                <ListItemActions
                                                    onEdit={() => handleEdit(quote)}
                                                    onDelete={() => handleDeleteClick(quote)}
                                                    className="tw-opacity-50 group-hover:tw-opacity-100 tw-transition-opacity"
                                                    editIcon={
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-text-white/70 hover:tw-text-white" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    }
                                                    deleteIcon={
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-4 tw-w-4 tw-text-white/70 hover:tw-text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteList; 
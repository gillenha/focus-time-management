import React, { useState, useEffect } from 'react';
import { fetchQuotes, addQuote, deleteQuote } from '../services/quotesService';
import { toast } from 'react-toastify';
import { ListItemActions } from '../components/shared';

const QuoteList = ({ onClose, isExiting }) => {
    const [quoteText, setQuoteText] = useState('');
    const [attribution, setAttribution] = useState('');
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showQuotes, setShowQuotes] = useState(false);
    const [editingQuote, setEditingQuote] = useState(null);

    useEffect(() => {
        loadQuotes();
    }, []);

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

    const handleAddQuote = async (e) => {
        e.preventDefault();
        if (!quoteText.trim()) return;
        
        try {
            if (editingQuote) {
                // Handle edit
                const updatedQuote = {
                    ...editingQuote,
                    text: quoteText.trim(),
                    author: attribution.trim() || 'Unknown'
                };
                // TODO: Add updateQuote service function
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/quotes/${editingQuote._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedQuote),
                });
                
                if (!response.ok) throw new Error('Failed to update quote');
                
                const updatedQuotes = quotes.map(q => 
                    q._id === editingQuote._id ? updatedQuote : q
                );
                setQuotes(updatedQuotes);
                setEditingQuote(null);
                toast.success('Quote updated successfully');
            } else {
                // Handle add
                const formattedQuote = {
                    text: quoteText.trim(),
                    author: attribution.trim() || 'Unknown'
                };
                const updatedQuotes = await addQuote(formattedQuote);
                setQuotes(updatedQuotes);
                toast.success('Quote added successfully');
            }
            setQuoteText('');
            setAttribution('');
        } catch (error) {
            toast.error(editingQuote ? 'Failed to update quote' : 'Failed to add quote');
            console.error('Error:', error);
        }
    };

    const handleEdit = (quote) => {
        setEditingQuote(quote);
        setQuoteText(quote.text);
        setAttribution(quote.author);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRemoveQuote = async (quoteId) => {
        try {
            const updatedQuotes = await deleteQuote(quoteId);
            setQuotes(updatedQuotes);
            toast.success('Quote removed successfully');
        } catch (error) {
            toast.error('Failed to remove quote');
            console.error('Error removing quote:', error);
        }
    };

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
                            
                            {/* Add New Quote Form */}
                            <div className="tw-max-w-sm tw-mx-auto">
                                <form onSubmit={handleAddQuote} className="tw-mb-8">
                                    <div className="tw-flex tw-flex-col tw-space-y-4">
                                        <div className="tw-flex tw-flex-col tw-space-y-1">
                                            <label className="tw-text-sm tw-font-medium tw-text-white/80">Quote Text</label>
                                            <textarea
                                                value={quoteText}
                                                onChange={(e) => setQuoteText(e.target.value)}
                                                placeholder="Enter an inspiring focus quote..."
                                                className="tw-block tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-px-4 tw-py-3 tw-text-white tw-shadow-sm tw-transition-all hover:tw-border-white/20 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 tw-resize-none tw-overflow-y-auto tw-h-32 placeholder:tw-text-white/30"
                                            />
                                        </div>
                                        <div className="tw-flex tw-flex-col tw-space-y-1">
                                            <label className="tw-text-sm tw-font-medium tw-text-white/80">Attribution (Optional)</label>
                                            <input
                                                type="text"
                                                value={attribution}
                                                onChange={(e) => setAttribution(e.target.value)}
                                                placeholder="Enter the quote's author..."
                                                className="tw-block tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-white/5 tw-px-4 tw-py-3 tw-text-white tw-shadow-sm tw-transition-all hover:tw-border-white/20 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 placeholder:tw-text-white/30"
                                            />
                                        </div>
                                        <div>
                                            <button
                                                type="submit"
                                                className="primary-button"
                                            >
                                                Add Quote
                                            </button>
                                        </div>
                                    </div>
                                </form>

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
                                                        onDelete={() => handleRemoveQuote(quote._id)}
                                                        deleteConfirmTitle="Delete Quote"
                                                        deleteConfirmMessage={`Are you sure you want to delete this quote: "${quote.text}"?`}
                                                        className="tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity"
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
        </div>
    );
};

export default QuoteList; 
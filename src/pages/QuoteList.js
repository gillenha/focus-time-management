import React, { useState, useEffect } from 'react';
import { fetchQuotes, addQuote, deleteQuote } from '../services/quotesService';
import { toast } from 'react-toastify';

const QuoteList = ({ onClose, isExiting }) => {
    const [quoteText, setQuoteText] = useState('');
    const [attribution, setAttribution] = useState('');
    const [quotes, setQuotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showQuotes, setShowQuotes] = useState(false);

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
            const formattedQuote = `"${quoteText.trim()}"${attribution.trim() ? ` - ${attribution.trim()}` : ''}`;
            const updatedQuotes = await addQuote(formattedQuote);
            setQuotes(updatedQuotes);
            setQuoteText('');
            setAttribution('');
            toast.success('Quote added successfully');
        } catch (error) {
            toast.error('Failed to add quote');
            console.error('Error adding quote:', error);
        }
    };

    const handleRemoveQuote = async (index) => {
        try {
            const updatedQuotes = await deleteQuote(index);
            setQuotes(updatedQuotes);
            toast.success('Quote removed successfully');
        } catch (error) {
            toast.error('Failed to remove quote');
            console.error('Error removing quote:', error);
        }
    };

    return (
        <div className={`tw-fixed tw-inset-0 tw-bg-white tw-z-50 ${isExiting ? 'slide-out' : 'slide-in'}`}>
            <div className="tw-h-full tw-overflow-y-scroll">
                <div className="tw-p-6">
                    {/* Header with close button */}
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <div className="tw-flex tw-items-center">
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
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Quote List</h2>
                        </div>
                    </div>

                    {/* Quote Management Section */}
                    <div className="tw-space-y-6">
                        <div>
                            <h3 className="tw-text-lg tw-font-semibold tw-mb-4">Focus Quotes</h3>
                            
                            {/* Add New Quote Form */}
                            <div className="tw-max-w-sm tw-mx-auto">
                                <form onSubmit={handleAddQuote} className="tw-mb-8">
                                    <div className="tw-flex tw-flex-col tw-space-y-4">
                                        <div className="tw-flex tw-flex-col tw-space-y-1">
                                            <label className="tw-text-sm tw-font-medium tw-text-gray-700">Quote Text</label>
                                            <textarea
                                                value={quoteText}
                                                onChange={(e) => setQuoteText(e.target.value)}
                                                placeholder="Enter an inspiring focus quote..."
                                                className="tw-block tw-w-full tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-px-4 tw-py-3 tw-text-gray-700 tw-shadow-sm tw-transition-all hover:tw-border-gray-300 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500 tw-resize-none tw-overflow-y-auto tw-h-32"
                                            />
                                        </div>
                                        <div className="tw-flex tw-flex-col tw-space-y-1">
                                            <label className="tw-text-sm tw-font-medium tw-text-gray-700">Attribution (Optional)</label>
                                            <input
                                                type="text"
                                                value={attribution}
                                                onChange={(e) => setAttribution(e.target.value)}
                                                placeholder="Enter the quote's author..."
                                                className="tw-block tw-w-full tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-px-4 tw-py-3 tw-text-gray-700 tw-shadow-sm tw-transition-all hover:tw-border-gray-300 focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <button
                                                type="submit"
                                                className="tw-w-full tw-inline-flex tw-items-center tw-justify-center tw-rounded-lg tw-bg-blue-500 tw-px-4 tw-py-2.5 tw-text-sm tw-font-semibold tw-text-white hover:tw-bg-blue-600 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-ring-offset-2 tw-cursor-pointer"
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
                                        className="tw-flex tw-items-center tw-text-lg tw-font-semibold tw-text-gray-800 hover:tw-text-gray-900 tw-cursor-pointer tw-transition-colors"
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
                                        <p className="tw-text-center tw-text-gray-500 tw-italic tw-py-8">No quotes available.</p>
                                    ) : (
                                        quotes.map((quote, index) => (
                                            <div 
                                                key={index} 
                                                className="tw-group tw-relative tw-p-4 tw-transition-all tw-max-w-sm tw-mx-auto"
                                            >
                                                <p className="tw-text-gray-700 tw-text-base tw-leading-relaxed tw-break-words">{quote}</p>
                                                <button
                                                    onClick={() => handleRemoveQuote(index)}
                                                    className="tw-absolute tw-top-3 tw-right-3 tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-rounded-full hover:tw-bg-red-50 tw-p-1.5 tw-cursor-pointer"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="tw-h-3.5 tw-w-3.5 tw-text-gray-400 hover:tw-text-red-500 tw-transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
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
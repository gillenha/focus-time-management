const express = require('express');
const router = express.Router();
const { Client } = require('@notionhq/client');

// Initialize Notion client
const initializeNotion = () => {
    if (!process.env.NOTION_API_KEY) {
        console.error('NOTION_API_KEY missing. Current environment:', process.env.NODE_ENV);
        return null;
    }
    
    try {
        const notion = new Client({
            auth: process.env.NOTION_API_KEY
        });
        console.log('Notion client initialized successfully in', process.env.NODE_ENV);
        return notion;
    } catch (error) {
        console.error('Failed to initialize Notion client:', error);
        return null;
    }
};

const notion = initializeNotion();

// Log to Notion
router.post('/log', async (req, res) => {
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Notion API Key exists:', !!process.env.NOTION_API_KEY);
    console.log('Notion Database ID exists:', !!process.env.NOTION_DATABASE_ID);

    if (!notion) {
        console.error('Notion client not initialized - check your NOTION_API_KEY');
        return res.status(500).json({ error: 'Notion client not initialized' });
    }

    if (!process.env.NOTION_DATABASE_ID) {
        console.error('NOTION_DATABASE_ID is not defined in environment variables');
        return res.status(500).json({ error: 'Notion database ID not configured' });
    }

    try {
        console.log('Attempting to create Notion page with properties:', req.body.properties);
        
        const response = await notion.pages.create({
            parent: {
                database_id: process.env.NOTION_DATABASE_ID
            },
            properties: req.body.properties
        });

        console.log('Notion page created successfully');
        res.json({ success: true, notionResponse: response });
    } catch (error) {
        console.error('Detailed Notion error:', error);
        res.status(500).json({ 
            error: 'Failed to send to Notion', 
            details: error.message,
            code: error.code,
            statusCode: error.status
        });
    }
});

// Test Notion connection
router.get('/test', async (req, res) => {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
        return res.status(500).json({ 
            error: 'Missing configuration',
            notionKey: !!process.env.NOTION_API_KEY,
            databaseId: !!process.env.NOTION_DATABASE_ID
        });
    }

    if (!notion) {
        return res.status(500).json({ error: 'Notion client not initialized' });
    }

    try {
        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID
        });
        
        res.json({ 
            success: true, 
            message: 'Notion connection successful',
            databaseInfo: {
                results: response.results.length,
                hasMore: response.has_more
            }
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to connect to Notion', 
            details: error.message,
            code: error.code
        });
    }
});

module.exports = router; 
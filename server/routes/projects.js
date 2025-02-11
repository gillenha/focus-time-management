const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Get all projects
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Create a new project
router.post('/', async (req, res) => {
    try {
        const { name, projectDetails } = req.body;
        const project = new Project({
            name,
            projectDetails: projectDetails || '',
            createdAt: new Date()
        });
        await project.save();
        res.status(201).json({ project });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Update a project
router.put('/:id', async (req, res) => {
    try {
        const { name, projectDetails } = req.body;
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { 
                name,
                projectDetails: projectDetails || '',
                // createdAt will be preserved
            },
            { new: true }
        );
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Delete a project
router.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

module.exports = router; 
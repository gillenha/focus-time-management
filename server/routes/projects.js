const express = require('express');
const router = express.Router();
const { readData, writeData, generateId, findIndexById } = require('../utils/jsonStorage');

const PROJECTS_FILE = 'projects.json';

// Get all projects
router.get('/', async (req, res) => {
    try {
        const projects = readData(PROJECTS_FILE);
        // Sort by createdAt (newest first)
        const sortedProjects = projects.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        res.json({ projects: sortedProjects });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Create a new project
router.post('/', async (req, res) => {
    try {
        const { name, projectDetails } = req.body;
        const projects = readData(PROJECTS_FILE);

        const newProject = {
            _id: generateId(),
            name,
            projectDetails: projectDetails || '',
            createdAt: new Date().toISOString()
        };

        projects.push(newProject);
        writeData(PROJECTS_FILE, projects);

        res.status(201).json({ project: newProject });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Update a project
router.put('/:id', async (req, res) => {
    try {
        const { name, projectDetails } = req.body;
        const projects = readData(PROJECTS_FILE);
        const index = findIndexById(projects, req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Project not found' });
        }

        projects[index] = {
            ...projects[index],
            name: name !== undefined ? name : projects[index].name,
            projectDetails: projectDetails !== undefined ? projectDetails : projects[index].projectDetails
        };

        writeData(PROJECTS_FILE, projects);
        res.json({ project: projects[index] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Delete a project
router.delete('/:id', async (req, res) => {
    try {
        const projects = readData(PROJECTS_FILE);
        const index = findIndexById(projects, req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Project not found' });
        }

        projects.splice(index, 1);
        writeData(PROJECTS_FILE, projects);

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

module.exports = router;

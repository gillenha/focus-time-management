const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');

// Get all projects
router.get('/', projectsController.getProjects);

// Create a new project
router.post('/', projectsController.createProject);

// Update a project
router.put('/:id', projectsController.updateProject);

// Delete a project
router.delete('/:id', projectsController.deleteProject);

module.exports = router; 
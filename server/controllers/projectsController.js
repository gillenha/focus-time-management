const Project = require('../models/Project');

// Get all projects
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json({ projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

// Create a new project
exports.createProject = async (req, res) => {
    try {
        const { name, createdAt } = req.body;
        const project = new Project({
            name,
            createdAt
        });
        const savedProject = await project.save();
        res.status(201).json({ project: savedProject });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

// Update a project
exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const project = await Project.findByIdAndUpdate(
            id,
            { name },
            { new: true }
        );
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

// Delete a project
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByIdAndDelete(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
}; 
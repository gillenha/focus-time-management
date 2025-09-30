const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');

// GET all favorites
router.get('/', async (req, res) => {
    try {
        const favorites = await Favorite.find().sort({ createdAt: -1 });
        res.json(favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

// POST new favorite
router.post('/', async (req, res) => {
    try {
        const { title, imageUrl, source = 'custom', tags = [] } = req.body;

        if (!title || !imageUrl) {
            return res.status(400).json({ error: 'Title and imageUrl are required' });
        }

        const newFavorite = new Favorite({
            title,
            imageUrl,
            source,
            tags
        });

        const savedFavorite = await newFavorite.save();
        res.status(201).json(savedFavorite);
    } catch (error) {
        console.error('Error creating favorite:', error);
        res.status(500).json({ error: 'Failed to create favorite' });
    }
});

// DELETE favorite by ID
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedFavorite = await Favorite.findByIdAndDelete(id);

        if (!deletedFavorite) {
            return res.status(404).json({ error: 'Favorite not found' });
        }

        res.json({ message: 'Favorite deleted successfully', favorite: deletedFavorite });
    } catch (error) {
        console.error('Error deleting favorite:', error);
        res.status(500).json({ error: 'Failed to delete favorite' });
    }
});

// PUT update favorite by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, imageUrl, source, tags } = req.body;

        const updatedFavorite = await Favorite.findByIdAndUpdate(
            id,
            { title, imageUrl, source, tags },
            { new: true, runValidators: true }
        );

        if (!updatedFavorite) {
            return res.status(404).json({ error: 'Favorite not found' });
        }

        res.json(updatedFavorite);
    } catch (error) {
        console.error('Error updating favorite:', error);
        res.status(500).json({ error: 'Failed to update favorite' });
    }
});

module.exports = router;
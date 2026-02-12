const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Read data from a JSON file
 * @param {string} filename - Name of the JSON file (e.g., 'sessions.json')
 * @returns {Array} Array of data objects
 */
function readData(filename) {
    const filePath = path.join(DATA_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
}

/**
 * Write data to a JSON file
 * @param {string} filename - Name of the JSON file (e.g., 'sessions.json')
 * @param {Array} data - Array of data objects to write
 */
function writeData(filename, data) {
    const filePath = path.join(DATA_DIR, filename);

    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        throw error;
    }
}

/**
 * Generate a unique ID (similar to MongoDB ObjectId)
 * @returns {string} Unique ID string
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Find item by ID
 * @param {Array} data - Array of data objects
 * @param {string} id - ID to search for
 * @returns {Object|null} Found object or null
 */
function findById(data, id) {
    return data.find(item => item._id === id) || null;
}

/**
 * Find index by ID
 * @param {Array} data - Array of data objects
 * @param {string} id - ID to search for
 * @returns {number} Index of item or -1 if not found
 */
function findIndexById(data, id) {
    return data.findIndex(item => item._id === id);
}

module.exports = {
    readData,
    writeData,
    generateId,
    findById,
    findIndexById,
    DATA_DIR
};

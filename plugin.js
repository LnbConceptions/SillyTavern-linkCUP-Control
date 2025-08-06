const express = require('express');
const { Router } = require('express');
const fs = require('fs');
const path = require('path');

// Plugin info
const info = {
    id: 'linkcup-interface',
    name: 'linkCUP Interface',
    description: 'A plugin for integrating with linkCUP devices via Bluetooth',
};

/**
 * Initialize the plugin.
 * @param router Express Router
 */
async function init(router) {
    console.log('linkCUP Interface plugin loaded!');
    
    // Serve static files from the 'public' directory
    router.use('/', express.static(path.join(__dirname, 'public')));
    
    // Used to check if the server plugin is running
    router.post('/probe', (_req, res) => {
        return res.sendStatus(204);
    });
    
    // API endpoint to get the current status of the linkCUP device
    router.get('/status', (_req, res) => {
        // This would return the current status of the device
        // For now, we'll just return a placeholder
        return res.json({ connected: false, status: 'Not connected' });
    });
}

async function exit() {
    console.log('linkCUP Interface plugin exited');
}

// Export the plugin
module.exports = {
    init,
    exit,
    info,
};

// Also export as default for compatibility
module.exports.default = module.exports;

const express = require('express');
const router = express.Router();
const { executeCode } = require('../services/dockerService');

// Execute code
router.post('/', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }

    const validLanguages = ['python', 'cpp', 'nodejs'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ 
        error: `Invalid language. Supported: ${validLanguages.join(', ')}` 
      });
    }

    const result = await executeCode(code, language);
    res.json(result);

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;

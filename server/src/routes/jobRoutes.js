const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');

// POST / → createJob (protected, company only)
router.post('/', auth, jobController.createJob);

// GET /:id → getJob (public)
router.get('/:id', jobController.getJob);

// GET / → getCompanyJobs (protected, company only)
router.get('/', auth, jobController.getCompanyJobs);

module.exports = router;

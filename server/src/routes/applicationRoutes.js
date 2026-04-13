const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const decayController = require('../controllers/decayController');
const auth = require('../middleware/auth');

// Apply
router.post('/jobs/:jobId/apply', auth, applicationController.apply);

// Acknowledge promotion (NEW)
router.post('/:id/acknowledge', auth, decayController.acknowledge);

// Exit pipeline
router.post('/:id/withdraw', auth, applicationController.withdraw);
router.post('/:id/reject', auth, applicationController.reject);
router.post('/:id/hire', auth, applicationController.hire);

// Views
router.get('/status/:jobId', auth, applicationController.getStatus);
router.get('/jobs/:jobId', auth, applicationController.getJobApplications);

module.exports = router;
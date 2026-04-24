const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const decayController = require('../controllers/decayController');
const auth = require('../middleware/auth');

router.post('/jobs/:jobId/apply', auth, applicationController.apply);
router.post('/:id/acknowledge', auth, decayController.acknowledge);
router.post('/:id/withdraw', auth, applicationController.withdraw);
router.post('/:id/reject', auth, applicationController.reject);
router.post('/:id/hire', auth, applicationController.hire);
router.get('/status/:jobId', auth, applicationController.getStatus);
router.get('/jobs/:jobId', auth, applicationController.getJobApplications);
router.get('/:id/history', auth, applicationController.getApplicationHistory);

module.exports = router;
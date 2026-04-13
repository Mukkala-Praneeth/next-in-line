const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicantController');

router.post('/register', applicantController.register);
router.post('/login', applicantController.login);

module.exports = router;

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

router.post('/register', companyController.register);
router.post('/login', companyController.login);

module.exports = router;

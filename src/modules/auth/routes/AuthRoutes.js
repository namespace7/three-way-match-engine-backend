'use strict';

const express = require('express');
const AuthController = require('../controller/AuthController');

const router = express.Router();
const authController = new AuthController();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

module.exports = router;

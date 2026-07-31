'use strict';

const express = require('express');
const AuthController = require('../controller/AuthController');

const router = express.Router();
const authController = new AuthController();

router.post('/login', authController.login);

module.exports = router;

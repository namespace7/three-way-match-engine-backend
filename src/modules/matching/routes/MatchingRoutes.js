'use strict';

const express = require('express');
const MatchingController = require('../controller/MatchingController');

const router = express.Router();
const matchingController = new MatchingController();

/**
 * GET /api/v1/match/:poNumber
 */
router.get('/:poNumber', matchingController.match);

module.exports = router;

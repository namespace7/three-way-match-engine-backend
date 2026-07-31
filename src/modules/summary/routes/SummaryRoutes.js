'use strict';

const express = require('express');
const SummaryController = require('../controller/SummaryController');

const router = express.Router();
const summaryController = new SummaryController();

router.get('/:poNumber', summaryController.getSummary);

module.exports = router;

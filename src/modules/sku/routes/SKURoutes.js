'use strict';

const express = require('express');
const SKUController = require('../controller/SKUController');

const router = express.Router();
const skuController = new SKUController();

router.post('/', skuController.createSKU);
router.get('/', skuController.getSKUs);
router.get('/:id', skuController.getSKUById);
router.patch('/:id', skuController.updateSKU);
router.delete('/:id', skuController.deleteSKU);

module.exports = router;

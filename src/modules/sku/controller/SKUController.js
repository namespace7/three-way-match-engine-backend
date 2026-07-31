'use strict';

const SKURepository = require('../../../repositories/SKURepository');

/**
 * @class SKUController
 *
 * Handles HTTP CRUD requests for SKU master catalogue.
 */
class SKUController {
  constructor(skuRepository) {
    this._skuRepository = skuRepository || new SKURepository();
  }

  /**
   * Normalizes tolerance fields (priceTolerance ↔ tolerancePercentage).
   * @private
   */
  _normalizeTolerance(data) {
    const normalized = { ...data };

    if (normalized.tolerancePercentage !== undefined && normalized.priceTolerance === undefined) {
      normalized.priceTolerance = normalized.tolerancePercentage / 100;
    } else if (normalized.priceTolerance !== undefined && normalized.tolerancePercentage === undefined) {
      normalized.tolerancePercentage = normalized.priceTolerance > 1
        ? normalized.priceTolerance
        : normalized.priceTolerance * 100;

      if (normalized.priceTolerance > 1) {
        normalized.priceTolerance = normalized.priceTolerance / 100;
      }
    } else if (normalized.priceTolerance !== undefined && normalized.priceTolerance > 1) {
      normalized.tolerancePercentage = normalized.priceTolerance;
      normalized.priceTolerance = normalized.priceTolerance / 100;
    }

    return normalized;
  }

  createSKU = async (req, res, next) => {
    try {
      const rawData = req.body;
      if (!rawData.skuCode || typeof rawData.skuCode !== 'string') {
        const error = new Error('skuCode is required');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const skuData = this._normalizeTolerance(rawData);
      const created = await this._skuRepository.create(skuData);

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  getSKUs = async (req, res, next) => {
    try {
      const { isActive } = req.query;
      const filter = {};
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      const skus = await this._skuRepository.findMany(filter);
      return res.status(200).json({
        success: true,
        data: skus,
      });
    } catch (err) {
      next(err);
    }
  };

  getSKUById = async (req, res, next) => {
    try {
      const { id } = req.params;
      let sku = null;

      try {
        sku = await this._skuRepository.findById(id);
      } catch (_err) {
        // Fallback to findBySkuCode if not a valid ObjectId
      }

      if (!sku) {
        sku = await this._skuRepository.findBySkuCode(id.trim().toUpperCase());
      }

      if (!sku) {
        const error = new Error(`SKU with identifier "${id}" not found`);
        error.statusCode = 404;
        error.code = 'SKU_NOT_FOUND';
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: sku,
      });
    } catch (err) {
      next(err);
    }
  };

  updateSKU = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = this._normalizeTolerance(req.body);
      let updated = null;

      try {
        updated = await this._skuRepository.updateById(id, updates);
      } catch (_err) {
        // Fallback to updateBySkuCode
      }

      if (!updated) {
        updated = await this._skuRepository.updateBySkuCode(id.trim().toUpperCase(), updates);
      }

      if (!updated) {
        const error = new Error(`SKU with identifier "${id}" not found`);
        error.statusCode = 404;
        error.code = 'SKU_NOT_FOUND';
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteSKU = async (req, res, next) => {
    try {
      const { id } = req.params;
      let deleted = null;

      try {
        deleted = await this._skuRepository.deleteById(id);
      } catch (_err) {
        // Fallback to deleteBySkuCode
      }

      if (!deleted) {
        deleted = await this._skuRepository.deleteBySkuCode(id.trim().toUpperCase());
      }

      if (!deleted) {
        const error = new Error(`SKU with identifier "${id}" not found`);
        error.statusCode = 404;
        error.code = 'SKU_NOT_FOUND';
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: deleted,
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = SKUController;

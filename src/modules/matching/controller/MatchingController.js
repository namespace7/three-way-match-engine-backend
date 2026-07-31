'use strict';

const MatchingService = require('../service/MatchingService');

/**
 * @class MatchingController
 *
 * Controller handling HTTP endpoints for the Three-Way Match Engine.
 * Responsibilities: validate input params, invoke MatchingService, handle PO not found (404), return 200 JSON.
 * Contains no business logic.
 */
class MatchingController {
  /**
   * @param {MatchingService} [matchingService]
   */
  constructor(matchingService) {
    this._matchingService = matchingService || new MatchingService();
  }

  /**
   * Handles GET /api/v1/match/:poNumber
   */
  match = async (req, res, next) => {
    try {
      const { poNumber } = req.params;

      if (!poNumber || poNumber.trim() === '') {
        const error = new Error('poNumber parameter is required');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const normalizedPoNumber = poNumber.trim();
      const result = await this._matchingService.match(normalizedPoNumber);
      const summary = typeof result.getSummary === 'function' ? result.getSummary() : result;

      // Handle PO not found -> 404
      const isPoNotFound = summary.reasons && summary.reasons.some((r) => r.includes('PO_NOT_FOUND'));
      if (isPoNotFound) {
        const error = new Error(`Purchase Order "${normalizedPoNumber}" not found`);
        error.statusCode = 404;
        error.code = 'PO_NOT_FOUND';
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = MatchingController;

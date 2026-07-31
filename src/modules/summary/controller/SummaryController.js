'use strict';

const SummaryService = require('../service/SummaryService');

/**
 * @class SummaryController
 *
 * Controller handling GET /api/v1/summary/:poNumber
 */
class SummaryController {
  constructor(summaryService) {
    this._summaryService = summaryService || new SummaryService();
  }

  getSummary = async (req, res, next) => {
    try {
      const { poNumber } = req.params;
      if (!poNumber || typeof poNumber !== 'string' || poNumber.trim() === '') {
        const error = new Error('poNumber parameter is required');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const summary = await this._summaryService.getSummary(poNumber.trim());

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = SummaryController;

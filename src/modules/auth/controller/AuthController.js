'use strict';

const { STATIC_TOKEN } = require('../../../middlewares/auth');

/**
 * @class AuthController
 *
 * Handles HTTP authentication requests.
 */
class AuthController {
  login = async (req, res) => {
    return res.status(200).json({
      success: true,
      data: {
        token: STATIC_TOKEN,
        type: 'Bearer',
        message: 'Authentication successful',
      },
    });
  };
}

module.exports = AuthController;

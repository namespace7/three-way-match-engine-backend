'use strict';

const MockDocumentParser = require('./MockDocumentParser');
const GeminiDocumentParser = require('./GeminiDocumentParser');
const env = require('../../../config/env');

/**
 * @class ParserFactory
 *
 * Factory responsible for creating concrete DocumentParser strategy instances.
 * Selects GeminiDocumentParser when USE_GEMINI=true, otherwise defaults to MockDocumentParser.
 */
class ParserFactory {
  /**
   * Instantiates and returns a concrete DocumentParser.
   *
   * @param {boolean} [useGemini] - Explicit boolean override. If omitted, reads env.USE_GEMINI or process.env.USE_GEMINI.
   * @returns {import('./DocumentParser')} Concrete DocumentParser instance.
   */
  static createParser(useGemini) {
    const isGeminiEnabled = useGemini !== undefined
      ? Boolean(useGemini)
      : env.USE_GEMINI || process.env.USE_GEMINI === 'true';

    if (isGeminiEnabled) {
      return new GeminiDocumentParser();
    }

    return new MockDocumentParser();
  }

  /**
   * Alias for createParser.
   * @param {boolean} [useGemini]
   * @returns {import('./DocumentParser')}
   */
  static getParser(useGemini) {
    return ParserFactory.createParser(useGemini);
  }
}

module.exports = ParserFactory;

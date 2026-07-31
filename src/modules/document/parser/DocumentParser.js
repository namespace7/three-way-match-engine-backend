'use strict';

/**
 * @abstract
 * @class DocumentParser
 *
 * Abstract base class for all document parsers.
 *
 * Every concrete parser (PDF, image, XML, EDI, …) must extend this class
 * and provide a real implementation of `parse()`.
 *
 * Design notes (SOLID):
 *  - Single Responsibility : knows only how to define the parsing contract.
 *  - Open/Closed           : extend via subclasses; never modify this file.
 *  - Liskov Substitution   : any subclass must be drop-in replaceable here.
 */
class DocumentParser {
  /**
   * Parse the file at `filePath` and return a plain structured object.
   *
   * @abstract
   * @param {string} filePath - Absolute or relative path to the document file.
   * @returns {Promise<Record<string, unknown>>} Parsed document data.
   * @throws {Error} Always throws in the base class — subclasses must override.
   */
  // eslint-disable-next-line no-unused-vars
  async parse(filePath) {
    throw new Error('Not Implemented');
  }
}

module.exports = DocumentParser;

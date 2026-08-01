'use strict';

/**
 * Normalizes Unit of Measure (UOM) strings to prevent OCR artifacts (such as "INI", "IND", "1")
 * from cluttering procurement document line items.
 *
 * @param {string} rawUnit - Raw UOM string from parser or document.
 * @returns {string} Normalized UOM string (defaults to 'EA').
 */
function normalizeUom(rawUnit) {
  if (!rawUnit || typeof rawUnit !== 'string') return 'EA';
  const clean = rawUnit.trim().toUpperCase();

  // Known OCR misreads / garbled artifacts for "EA" or "NOS"
  if (['INI', 'IND', 'NO', 'NOS', '1', 'UN', 'UNT'].includes(clean)) {
    return 'EA';
  }

  return clean;
}

module.exports = { normalizeUom };

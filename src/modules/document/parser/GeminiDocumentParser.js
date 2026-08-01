'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const DocumentParser = require('./DocumentParser');
const env = require('../../../config/env');

/**
 * @class GeminiDocumentParser
 * @extends DocumentParser
 *
 * Concrete parser that calls the Google Gemini API to extract structured JSON data
 * from uploaded PDF or image documents.
 */
class GeminiDocumentParser extends DocumentParser {
  /**
   * @param {string} [apiKey] - Gemini API key. Defaults to env.GEMINI_API_KEY.
   * @param {Object} [httpClient] - HTTP client instance for testing/mocking. Defaults to axios.
   */
  constructor(apiKey = env.GEMINI_API_KEY, httpClient = axios) {
    super();
    this._apiKey = apiKey;
    this._httpClient = httpClient;
    this._baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  }

  /**
   * Reads the document at `filePath`, encodes it as base64, calls the Gemini API,
   * and returns the extracted structured JSON object.
   *
   * @param {string} filePath - Path to PDF or image file.
   * @returns {Promise<Record<string, unknown>>} Extracted JSON object.
   */
  async parse(filePath) {
    if (!this._apiKey) {
      throw new Error('[GeminiParser Error] GEMINI_API_KEY is not configured.');
    }

    if (!filePath || typeof filePath !== 'string') {
      throw new Error('[GeminiParser Error] Invalid filePath provided.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`[GeminiParser Error] File not found at path: "${filePath}"`);
    }

    const mimeType = this._getMimeType(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const promptText = `
You are an expert document extraction system.
Extract all data from this document into structured JSON.
`;

    try {
      const response = await this._httpClient.post(
        `${this._baseUrl}?key=${this._apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      const rawText = this._extractResponseText(response);
      return this._cleanAndParseJson(rawText);
    } catch (error) {
      if (error.code === 'PARSER_JSON_ERROR') {
        throw error;
      }
      const status = error.response?.status;
      const apiMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`[GeminiParser Error] API call failed${status ? ` (${status})` : ''}: ${apiMessage}`);
    }
  }

  /**
   * Resolves MIME type from file extension.
   * @private
   */
  _getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/pdf';
  }

  /**
   * Extracts response text from Gemini API response.
   * @private
   */
  _extractResponseText(response) {
    if (typeof response === 'string') return response;
    if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    }
    if (response?.text) return response.text;
    if (typeof response?.data === 'object') {
      return JSON.stringify(response.data);
    }
    throw new Error('[GeminiParser Error] Unexpected API response structure.');
  }

  /**
   * Cleans markdown code blocks and parses JSON string safely.
   * @private
   */
  _cleanAndParseJson(rawText) {
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (err) {
      const parseError = new Error(`[GeminiParser Error] Failed to parse API output as JSON: ${err.message}`);
      parseError.code = 'PARSER_JSON_ERROR';
      throw parseError;
    }
  }
}

module.exports = GeminiDocumentParser;

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
  async parse(filePath, documentType = 'PURCHASE_ORDER') {
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

    const promptText = this._buildPrompt(documentType);

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
          timeout: 120000,
        }
      );

      const rawText = this._extractResponseText(response);
      return this._cleanAndParseJson(rawText);
    } catch (error) {
      if (error.code === 'PARSER_JSON_ERROR') {
        throw error;
      }
      console.log(`[GeminiParser Error] API call failed: ${error.message}`);
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
      console.log('[GeminiParser] Extracted text from Gemini API response:', response.data.candidates[0].content.parts[0].text);
      return response.data.candidates[0].content.parts[0].text;
    }
    console.log('[GeminiParser] Unexpected API response structure:', JSON.stringify(response, null, 2));
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
        console.log('[GeminiParser] Cleaned text for JSON parsing:', cleaned);
      return JSON.parse(cleaned);
    } catch (err) {
      const parseError = new Error(`[GeminiParser Error] Failed to parse API output as JSON: ${err.message}`);
      parseError.code = 'PARSER_JSON_ERROR';
      throw parseError;
    }
  }

  /**
   * Builds a document-type-specific extraction prompt with exact JSON schema.
   * Using a strict schema prevents Gemini from inventing different key names
   * on each call and ensures the DocumentMapper can reliably read the output.
   * @private
   */
  _buildPrompt(documentType) {
    const preamble = [
      'You are an expert document data extraction system for Indian procurement documents.',
      '',
      'Extract ALL data from the document and return ONLY a single valid JSON object.',
      '',
      'STRICT RULES:',
      '1. Use EXACTLY the key names shown in the schema below. Do not rename or add keys.',
      '2. Every line item MUST be a separate object in the line_items array with its own closing brace.',
      '3. Do not merge multiple line items into a single object.',
      '4. Return only valid JSON. No markdown, no code fences, no explanations.',
      '5. Use null for missing fields, 0 for missing numeric fields.',
      '',
      'Use EXACTLY this JSON schema:',
      '',
    ].join('\n');

    if (documentType === 'GRN') {
      return preamble + JSON.stringify({
        grn: { grn_number: '', po_reference: '', received_date: '', warehouse: '', received_by: '' },
        vendor_details: { name: '', address: '', gstin: '' },
        line_items: [{
          s_no: 1, item_code: '', item_description: '', hsn_code: '',
          ordered_quantity: 0, received_quantity: 0, rejected_quantity: 0,
          rejection_reason: null, unit_price: 0, total_inr: 0,
        }],
        summary_totals: { total_received_qty: 0, total_rejected_qty: 0, grand_total_inr: 0 },
      }, null, 2);
    }

    if (documentType === 'INVOICE') {
      return preamble + JSON.stringify({
        invoice: {
          invoice_number: '', po_number: '', grn_number: null,
          invoice_date: '', due_date: null, payment_terms: '',
        },
        vendor_details: { name: '', address: '', gstin: '', pan: '', contact: '' },
        billing_address: { company_name: '', address: '', gstin: '' },
        line_items: [{
          s_no: 1, item_code: '', item_description: '', hsn_code: '',
          qty: 0, unit_base_cost_inr: 0, taxable_value_inr: 0,
          cgst_rate: 0, cgst_amt_inr: 0, sgst_ugst_rate: 0, sgst_ugst_amt_inr: 0,
          igst_rate: 0, igst_amt_inr: 0, total_inr: 0,
        }],
        summary_totals: { total_amount_inr: 0, total_tax_inr: 0, grand_total_inr: 0 },
      }, null, 2);
    }

    // Default: PURCHASE_ORDER
    return preamble + JSON.stringify({
      purchase_order: {
        po_no: '', po_date: '', payment_terms: '',
        expected_delivery_date: '', po_expiry_date: '', reference_po_code: null,
      },
      vendor_details: { name: '', address: '', gstin: '', pan: '', contact: '' },
      billing_address: { company_name: '', address: '', email: '', contact: '', gstin: '' },
      shipping_address: { company_name: '', address: '', email: '', contact: '', gstin: '' },
      line_items: [{
        s_no: 1, item_code: '', item_description: '', hsn_code: '',
        qty: 0, mrp: 0, unit_base_cost_inr: 0, taxable_value_inr: 0,
        cgst_rate: 0, cgst_amt_inr: 0, sgst_ugst_rate: 0, sgst_ugst_amt_inr: 0,
        igst_rate: 0, igst_amt_inr: 0, total_inr: 0,
      }],
      summary_totals: { total_amount_inr: 0, total_tax_inr: 0, grand_total_inr: 0 },
    }, null, 2);
  }
}

module.exports = GeminiDocumentParser;

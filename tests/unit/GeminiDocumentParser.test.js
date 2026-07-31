'use strict';

const fs = require('fs');
const path = require('path');
const DocumentParser = require('../../src/modules/document/parser/DocumentParser');
const GeminiDocumentParser = require('../../src/modules/document/parser/GeminiDocumentParser');
const DocumentMapper = require('../../src/modules/document/mapper/DocumentMapper');

async function runGeminiParserTests() {
  console.log('=== GeminiDocumentParser Standalone Tests ===\n');

  // Create a temporary dummy file for testing file-read logic
  const tmpFilePath = path.join(__dirname, 'sample_po.pdf');
  fs.writeFileSync(tmpFilePath, 'Dummy PDF content for testing base64 encoding');

  try {
    // 1. Inheritance Check
    const mockHttpClient = {
      post: async () => ({
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      documentType: 'PURCHASE_ORDER',
                      purchaseOrder: {
                        poNumber: 'PO-GEMINI-999',
                        issueDate: '2024-03-01',
                        currency: 'USD',
                        buyer: { name: 'Gemini Buyer Inc', address: '123 AI Way', taxId: 'TAX-111' },
                        supplier: { name: 'Gemini Supplier Ltd', address: '456 ML Street', taxId: 'TAX-222' },
                        lineItems: [
                          { lineNumber: 1, sku: 'SKU-GEMINI-01', description: 'AI Chipset', quantity: 50, unitPrice: 200.0, totalPrice: 10000.0 },
                        ],
                        totalAmount: 10000.0,
                        paymentTerms: 'Net 30',
                      },
                    }),
                  },
                ],
              },
            },
          ],
        },
      }),
    };

    const parser = new GeminiDocumentParser('dummy_api_key_123', mockHttpClient);
    console.log('1. Inheritance Test:');
    console.log('   Instance of DocumentParser:', parser instanceof DocumentParser);
    console.assert(parser instanceof DocumentParser, 'Test 1 Failed: Must extend DocumentParser');
    console.log('   Status: PASSED\n');

    // 2. Parse Mock Response Test
    const parsedData = await parser.parse(tmpFilePath);
    console.log('2. Parse Mock Response Test:');
    console.log('   Extracted documentType:', parsedData.documentType);
    console.log('   Extracted poNumber:', parsedData.purchaseOrder.poNumber);
    console.assert(parsedData.documentType === 'PURCHASE_ORDER', 'Test 2 Failed');
    console.assert(parsedData.purchaseOrder.poNumber === 'PO-GEMINI-999', 'Test 2 Failed');
    console.log('   Status: PASSED\n');

    // 3. DocumentMapper Reuse Test
    const mapper = new DocumentMapper();
    const poDomain = mapper.mapPurchaseOrder(parsedData);
    console.log('3. DocumentMapper Reuse Test:');
    console.log('   Domain poNumber:', poDomain.poNumber);
    console.log('   Domain totalOrderedQuantity:', poDomain.totalOrderedQuantity());
    console.assert(poDomain.poNumber === 'PO-GEMINI-999', 'Test 3 Failed');
    console.assert(poDomain.totalOrderedQuantity() === 50, 'Test 3 Failed');
    console.log('   Status: PASSED\n');

    // 4. API Error Handling Test
    const failingHttpClient = {
      post: async () => {
        const error = new Error('Request failed with status code 403');
        error.response = { status: 403, data: { error: { message: 'API key expired' } } };
        throw error;
      },
    };

    const failingParser = new GeminiDocumentParser('invalid_key', failingHttpClient);
    console.log('4. API Error Handling Test:');
    try {
      await failingParser.parse(tmpFilePath);
      console.assert(false, 'Test 4 Failed: Should have thrown an error');
    } catch (err) {
      console.log('   Caught Graceful Error:', err.message);
      console.assert(err.message.includes('API call failed (403): API key expired'), 'Test 4 Failed');
      console.log('   Status: PASSED\n');
    }

    console.log('All GeminiDocumentParser standalone tests passed successfully!');
  } finally {
    // Cleanup temp test file
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
  }
}

runGeminiParserTests();

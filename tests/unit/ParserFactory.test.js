'use strict';

const ParserFactory = require('../../src/modules/document/parser/ParserFactory');
const MockDocumentParser = require('../../src/modules/document/parser/MockDocumentParser');
const GeminiDocumentParser = require('../../src/modules/document/parser/GeminiDocumentParser');

function runParserFactoryTests() {
  console.log('=== ParserFactory Standalone Tests ===\n');

  // Save original env value
  const originalUseGemini = process.env.USE_GEMINI;

  try {
    // Test 1: USE_GEMINI=false returns MockDocumentParser
    process.env.USE_GEMINI = 'false';
    const mockParser = ParserFactory.createParser();
    console.log('1. USE_GEMINI=false Test:');
    console.log('   Returned Parser Class:', mockParser.constructor.name);
    console.assert(mockParser instanceof MockDocumentParser, 'Test 1 Failed: Must return MockDocumentParser');
    console.assert(!(mockParser instanceof GeminiDocumentParser), 'Test 1 Failed: Should NOT be GeminiDocumentParser');
    console.log('   Status: PASSED\n');

    // Test 2: USE_GEMINI=true returns GeminiDocumentParser
    process.env.USE_GEMINI = 'true';
    const geminiParser = ParserFactory.createParser();
    console.log('2. USE_GEMINI=true Test:');
    console.log('   Returned Parser Class:', geminiParser.constructor.name);
    console.assert(geminiParser instanceof GeminiDocumentParser, 'Test 2 Failed: Must return GeminiDocumentParser');
    console.assert(!(geminiParser instanceof MockDocumentParser), 'Test 2 Failed: Should NOT be MockDocumentParser');
    console.log('   Status: PASSED\n');

    // Test 3: Explicit parameter overrides environment
    const explicitMock = ParserFactory.createParser(false);
    console.log('3. Explicit Parameter Override (createParser(false)) Test:');
    console.log('   Returned Parser Class:', explicitMock.constructor.name);
    console.assert(explicitMock instanceof MockDocumentParser, 'Test 3 Failed: Must return MockDocumentParser');
    console.log('   Status: PASSED\n');

    const explicitGemini = ParserFactory.createParser(true);
    console.log('4. Explicit Parameter Override (createParser(true)) Test:');
    console.log('   Returned Parser Class:', explicitGemini.constructor.name);
    console.assert(explicitGemini instanceof GeminiDocumentParser, 'Test 4 Failed: Must return GeminiDocumentParser');
    console.log('   Status: PASSED\n');

    console.log('All ParserFactory tests passed successfully!');
  } finally {
    // Restore original env
    if (originalUseGemini !== undefined) {
      process.env.USE_GEMINI = originalUseGemini;
    } else {
      delete process.env.USE_GEMINI;
    }
  }
}

runParserFactoryTests();

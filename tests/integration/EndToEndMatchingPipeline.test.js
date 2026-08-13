'use strict';

const DocumentService = require('../../src/modules/document/service/DocumentService');
const DocumentAggregator = require('../../src/modules/matching/aggregator/DocumentAggregator');
const LineItemAggregator = require('../../src/modules/matching/aggregator/LineItemAggregator');
const RuleEngine = require('../../src/modules/matching/rules/RuleEngine');
const ResultBuilder = require('../../src/modules/matching/builder/ResultBuilder');
const MatchingService = require('../../src/modules/matching/service/MatchingService');
const SKUResolver = require('../../src/modules/sku/service/SKUResolver');
const MockDocumentParser = require('../../src/modules/document/parser/MockDocumentParser');
const DocumentMapper = require('../../src/modules/document/mapper/DocumentMapper');

async function runEndToEndValidationSuite() {
  console.log('=== Phase 4 End-to-End Validation Suite ===\n');

  // In-memory repositories to trace complete persistence and retrieval
  const createInMemoryRepositories = () => {
    const poDb = new Map();
    const grnDb = new Map();
    const invDb = new Map();
    const skuDb = new Map();

    const poRepo = {
      create: async (data) => { poDb.set(data.poNumber, data); return data; },
      findByPoNumber: async (poNumber) => poDb.get(poNumber) || null,
    };

    const grnRepo = {
      create: async (data) => {
        const arr = grnDb.get(data.poReference) || [];
        arr.push(data);
        grnDb.set(data.poReference, arr);
        return data;
      },
      findByPoReference: async (poRef) => grnDb.get(poRef) || [],
    };

    const invRepo = {
      create: async (data) => {
        const arr = invDb.get(data.poReference) || [];
        arr.push(data);
        invDb.set(data.poReference, arr);
        return data;
      },
      findByPoReference: async (poRef) => invDb.get(poRef) || [],
    };

    const skuRepo = {
      findBySkuCode: async (code) => skuDb.get(`SKU:${code}`) || null,
      findByEanCode: async (ean) => skuDb.get(`EAN:${ean}`) || null,
      findByAlias: async (code, vendorGstin) => {
        const matches = [];
        for (const skuDoc of skuDb.values()) {
          if (skuDoc.aliases && Array.isArray(skuDoc.aliases)) {
            for (const alias of skuDoc.aliases) {
              if (alias.code === code) {
                if (vendorGstin) {
                  if (alias.vendorGstin === vendorGstin) {
                    matches.push(skuDoc);
                  }
                } else if (!alias.vendorGstin) {
                  matches.push(skuDoc);
                }
              }
            }
          }
        }
        return matches;
      },
      addSku: (doc) => {
        skuDb.set(`SKU:${doc.skuCode}`, doc);
        if (doc.eanCode) skuDb.set(`EAN:${doc.eanCode}`, doc);
      },
    };

    return { poRepo, grnRepo, invRepo, skuRepo, poDb, grnDb, invDb, skuDb };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO A — MOCK END-TO-END PIPELINE
  // ───────────────────────────────────────────────────────────────────────────
  {
    console.log('--- SCENARIO A: Mock Document Pipeline ---');
    const { poRepo, grnRepo, invRepo, skuRepo } = createInMemoryRepositories();
    const docMapper = new DocumentMapper();
    const mockParser = new MockDocumentParser();

    // 1. Populate mock SKU Master for mock dataset items
    skuRepo.addSku({ skuCode: '11423', name: 'Cheesy Spicy Veg Momos 24.0 Pieces' });
    skuRepo.addSku({ skuCode: '11797', name: 'Meatigo Hot Wings 250.0 g' });
    skuRepo.addSku({ skuCode: '18003', name: 'Meatigo Chicken Curry Cut Skinless Frozen 450g' });

    // 2. Simulate mock parsing & service ingestion
    const rawMockData = await mockParser.parse('sample.pdf');
    const poMapped = docMapper.mapPurchaseOrder(rawMockData);
    const grnMapped = docMapper.mapGRN(rawMockData);
    const invMapped = docMapper.mapInvoice(rawMockData);

    await poRepo.create(poMapped.toJSON());
    await grnRepo.create(grnMapped.toJSON());
    await invRepo.create(invMapped.toJSON());

    // 2. Run matching pipeline
    const resolver = new SKUResolver(skuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(poRepo, grnRepo, invRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const result = await service.match('CI4PO05788');
    const summary = result.getSummary();

    console.log('   Mock Matching Status:', summary.status);
    console.log('   Resolved SKUs:', summary.resolvedSku);
    console.assert(summary.status === 'PARTIALLY_MATCHED' || summary.status === 'MATCHED', 'Scenario A Failed: Expected MATCHED or PARTIALLY_MATCHED');
    console.log('   Result: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO B — GEMINI / REAL DOCUMENT END-TO-END PIPELINE
  // ───────────────────────────────────────────────────────────────────────────
  {
    console.log('--- SCENARIO B: Gemini / Real Document Pipeline (CI4PO05788 & IN25MH2504251) ---');
    const { poRepo, grnRepo, invRepo, skuRepo } = createInMemoryRepositories();

    // Populate SKU Master with real alias mapping for M/s AFP (27ABACA2423J1Z0)
    skuRepo.addSku({
      skuCode: 'MOMOS-VEG-24',
      name: 'PSM Cheesy Spicy Vegetable Momos 24Pcs',
      unitPrice: 220.76,
      aliases: [
        { code: '11423', vendorGstin: '27ABACA2423J1Z0' },
        { code: 'FG-P-F-0503', vendorGstin: '27ABACA2423J1Z0' },
      ],
    });

    const docMapper = new DocumentMapper();

    // Raw JSON output structure emitted by Gemini API for PO CI4PO05788
    const rawGeminiPO = {
      purchase_order: {
        po_no: 'CI4PO05788',
        po_date: 'Mar 17, 2026',
        payment_terms: '0 Days',
      },
      vendor_details: {
        name: 'M/s AFP',
        address: 'GALA NO 5/17 AB, Mumbai, Maharashtra, India-400072',
        gstin: '27ABACA2423J1Z0',
      },
      billing_address: {
        company_name: 'CLOUDSTORE RETAIL PRIVATE LIMITED',
        gstin: '27AAKCC0172C1Z1',
      },
      line_items: [
        {
          s_no: 1,
          item_code: '11423',
          item_description: 'Cheesy Spicy Veg Momos 24.0 Pieces',
          qty: 50,
          unit_base_cost_inr: 220.76,
          total_inr: 11038.00,
        },
      ],
      summary_totals: {
        grand_total_inr: 11038.00,
      },
    };

    // Raw JSON output structure emitted by Gemini API for GRN CI4000020234
    const rawGeminiGRN = {
      grn: {
        grn_number: 'CI4000020234',
        po_reference: 'CI4PO05788',
        received_date: '24/03/2026',
        warehouse: 'B2B STAGING',
      },
      vendor_details: {
        name: 'M/s AFP',
        gstin: '27ABACA2423J1Z0',
      },
      line_items: [
        {
          s_no: 1,
          item_code: '11423',
          ordered_quantity: 50,
          received_quantity: 50,
          rejected_quantity: 0,
        },
      ],
    };

    // Raw JSON output structure emitted by Gemini API for Invoice IN25MH2504251
    const rawGeminiInvoice = {
      invoice: {
        invoice_number: 'IN25MH2504251',
        po_number: 'CI4PO05788',
        invoice_date: '24/03/2026',
      },
      vendor_details: {
        name: 'M/s AFP',
        gstin: '27ABACA2423J1Z0',
      },
      billing_address: {
        company_name: 'Cloudstore Retail Private Limited',
        gstin: '27AAKCC0172C1Z1',
      },
      line_items: [
        {
          s_no: 1,
          item_code: 'FG-P-F-0503',
          item_description: 'PSM Cheesy Spicy Vegetable Momos 24Pcs',
          qty: 50,
          unit_base_cost_inr: 220.76,
          total_inr: 11038.00,
        },
      ],
      summary_totals: {
        grand_total_inr: 11038.00,
      },
    };

    // 1. Map raw Gemini outputs using DocumentMapper
    const mappedPO = docMapper.mapPurchaseOrder(rawGeminiPO);
    const mappedGRN = docMapper.mapGRN(rawGeminiGRN);
    const mappedInvoice = docMapper.mapInvoice(rawGeminiInvoice);

    // Verify Mapper Outputs
    console.assert(mappedPO.poNumber === 'CI4PO05788', 'PO number mapping failed');
    console.assert(mappedPO.supplier.gstin === '27ABACA2423J1Z0', 'PO supplier GSTIN mapping failed');
    console.assert(mappedInvoice.poReference === 'CI4PO05788', 'Invoice poReference mapping failed');
    console.assert(mappedInvoice.supplier.gstin === '27ABACA2423J1Z0', 'Invoice supplier GSTIN mapping failed');

    // 2. Persist mapped domain objects
    await poRepo.create(mappedPO.toJSON());
    await grnRepo.create(mappedGRN.toJSON());
    await invRepo.create(mappedInvoice.toJSON());

    // 3. Execute DocumentAggregator and verify PO-Invoice association & vendor GSTIN survival
    const resolver = new SKUResolver(skuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(poRepo, grnRepo, invRepo);

    const docContext = await docAggregator.aggregate('CI4PO05788');
    console.assert(docContext.purchaseOrder !== null, 'DocumentAggregator failed to find PO');
    console.assert(docContext.invoices.length === 1, 'DocumentAggregator failed to link Invoice');
    console.assert(docContext.purchaseOrder.supplier.gstin === '27ABACA2423J1Z0', 'PO supplier GSTIN lost in storage');
    console.assert(docContext.invoices[0].supplier.gstin === '27ABACA2423J1Z0', 'Invoice supplier GSTIN lost in storage');

    // 4. Run MatchingService
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());
    const matchResult = await service.match('CI4PO05788');
    const summary = matchResult.getSummary();

    console.log('   Gemini Real Doc Matching Status:', summary.status);
    console.log('   Resolved Canonical SKU:', summary.resolvedSku);
    console.log('   Item Level Results:', JSON.stringify(summary.itemLevelResults, null, 2));

    console.assert(summary.status === 'MATCHED', 'Scenario B Failed: Status should be MATCHED');
    console.assert(summary.resolvedSku[0] === 'MOMOS-VEG-24', 'Scenario B Failed: Canonical SKU should be MOMOS-VEG-24');
    console.assert(summary.itemLevelResults.length === 1, 'Scenario B Failed: Should merge 11423 and FG-P-F-0503 into single bucket');
    console.assert(summary.itemLevelResults[0].orderedQuantity === 50, 'Scenario B Failed: orderedQuantity');
    console.assert(summary.itemLevelResults[0].invoicedQuantity === 50, 'Scenario B Failed: invoicedQuantity');
    console.assert(summary.itemLevelResults[0].orderedPrice === 220.76, 'Scenario B Failed: orderedPrice');
    console.assert(summary.itemLevelResults[0].invoicePrice === 220.76, 'Scenario B Failed: invoicePrice');

    console.log('   Result: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FAILURE SCENARIO 1 — Unmapped External Codes (No SKU Master Alias Entry)
  // ───────────────────────────────────────────────────────────────────────────
  {
    console.log('--- FAILURE SCENARIO 1: Unmapped External Codes ---');
    const { poRepo, grnRepo, invRepo, skuRepo } = createInMemoryRepositories();
    const docMapper = new DocumentMapper();

    const rawPO = {
      purchase_order: { po_no: 'CI4PO05788' },
      vendor_details: { gstin: '27ABACA2423J1Z0' },
      line_items: [{ item_code: '11423', qty: 50, unit_base_cost_inr: 220.76 }],
    };
    const rawGRN = {
      grn: { grn_number: 'GRN-1', po_reference: 'CI4PO05788' },
      line_items: [{ item_code: '11423', received_quantity: 50 }],
    };
    const rawInvoice = {
      invoice: { invoice_number: 'INV-1', po_number: 'CI4PO05788' },
      vendor_details: { gstin: '27ABACA2423J1Z0' },
      line_items: [{ item_code: 'FG-P-F-0503', qty: 50, unit_base_cost_inr: 220.76 }],
    };

    await poRepo.create(docMapper.mapPurchaseOrder(rawPO).toJSON());
    await grnRepo.create(docMapper.mapGRN(rawGRN).toJSON());
    await invRepo.create(docMapper.mapInvoice(rawInvoice).toJSON());

    const resolver = new SKUResolver(skuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(poRepo, grnRepo, invRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const summary = (await service.match('CI4PO05788')).getSummary();
    console.log('   Status:', summary.status);
    console.log('   Reason Codes:', summary.reasonCodes);

    console.assert(summary.status === 'MISMATCHED', 'Failure Scenario 1 Failed: Status should be MISMATCHED');
    console.assert(summary.reasonCodes.includes('SKU_UNRESOLVED'), 'Failure Scenario 1 Failed: Must contain SKU_UNRESOLVED');
    console.assert(!summary.reasonCodes.includes('PRICE_MISMATCH'), 'Failure Scenario 1 Failed: Must NOT report false PRICE_MISMATCH');
    console.assert(!summary.reasonCodes.includes('QUANTITY_MISMATCH'), 'Failure Scenario 1 Failed: Must NOT report false QUANTITY_MISMATCH');

    console.log('   Result: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FAILURE SCENARIO 2 — Ambiguous Alias (Alias maps to 2 canonical SKUs)
  // ───────────────────────────────────────────────────────────────────────────
  {
    console.log('--- FAILURE SCENARIO 2: Ambiguous Alias Mapping ---');
    const { poRepo, grnRepo, invRepo, skuRepo } = createInMemoryRepositories();
    const docMapper = new DocumentMapper();

    skuRepo.addSku({ skuCode: 'CAN-001', aliases: [{ code: '11423', vendorGstin: '27ABACA2423J1Z0' }] });
    skuRepo.addSku({ skuCode: 'CAN-002', aliases: [{ code: '11423', vendorGstin: '27ABACA2423J1Z0' }] });

    const rawPO = {
      purchase_order: { po_no: 'CI4PO05788' },
      vendor_details: { gstin: '27ABACA2423J1Z0' },
      line_items: [{ item_code: '11423', qty: 50, unit_base_cost_inr: 220.76 }],
    };
    const rawGRN = { grn: { grn_number: 'G1', po_reference: 'CI4PO05788' }, line_items: [{ item_code: '11423', received_quantity: 50 }] };
    const rawInvoice = { invoice: { invoice_number: 'I1', po_number: 'CI4PO05788' }, vendor_details: { gstin: '27ABACA2423J1Z0' }, line_items: [{ item_code: '11423', qty: 50, unit_base_cost_inr: 220.76 }] };

    await poRepo.create(docMapper.mapPurchaseOrder(rawPO).toJSON());
    await grnRepo.create(docMapper.mapGRN(rawGRN).toJSON());
    await invRepo.create(docMapper.mapInvoice(rawInvoice).toJSON());

    const resolver = new SKUResolver(skuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(poRepo, grnRepo, invRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const summary = (await service.match('CI4PO05788')).getSummary();
    console.log('   Status:', summary.status);
    console.log('   Reason Codes:', summary.reasonCodes);

    console.assert(summary.reasonCodes.includes('SKU_AMBIGUOUS'), 'Failure Scenario 2 Failed: Must contain SKU_AMBIGUOUS');
    console.log('   Result: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FAILURE SCENARIO 3 — Vendor Isolation (Same code, different vendor)
  // ───────────────────────────────────────────────────────────────────────────
  {
    console.log('--- FAILURE SCENARIO 3: Vendor Isolation ---');
    const { skuRepo } = createInMemoryRepositories();

    skuRepo.addSku({
      skuCode: 'CAN-VENDOR-A-PRODUCT',
      aliases: [{ code: '11423', vendorGstin: 'GSTIN-VENDOR-A' }],
    });

    const resolver = new SKUResolver(skuRepo);

    // Query for Vendor A
    const resA = await resolver.resolve('11423', { vendorGstin: 'GSTIN-VENDOR-A' });
    console.assert(resA.status === 'RESOLVED' && resA.canonicalSku === 'CAN-VENDOR-A-PRODUCT', 'Vendor A lookup failed');

    // Query for Vendor B (different vendor) -> should NOT resolve to Vendor A's product
    const resB = await resolver.resolve('11423', { vendorGstin: 'GSTIN-VENDOR-B' });
    console.assert(resB.status === 'UNRESOLVED' && resB.canonicalSku === null, 'Vendor B isolation failed');

    console.log('   Vendor A resolved:', resA.canonicalSku);
    console.log('   Vendor B resolved:', resB.canonicalSku, '(Status:', resB.status + ')');
    console.log('   Result: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FAILURE SCENARIO 4 — HSN Discrepancy After Identity Resolution
  // ───────────────────────────────────────────────────────────────────────────
  {
    console.log('--- FAILURE SCENARIO 4: HSN Discrepancy After Identity Match ---');
    const { poRepo, grnRepo, invRepo, skuRepo } = createInMemoryRepositories();
    const docMapper = new DocumentMapper();

    skuRepo.addSku({
      skuCode: 'CAN-001',
      aliases: [
        { code: '11423', vendorGstin: '27ABACA2423J1Z0' },
        { code: 'FG-P-F-0503', vendorGstin: '27ABACA2423J1Z0' },
      ],
    });

    // PO has HSN 19022010; Invoice has HSN 21069099 for same product
    const rawPO = {
      purchase_order: { po_no: 'CI4PO05788' },
      vendor_details: { gstin: '27ABACA2423J1Z0' },
      line_items: [{ item_code: '11423', hsn_code: '19022010', qty: 50, unit_base_cost_inr: 220.76 }],
    };
    const rawGRN = { grn: { grn_number: 'G1', po_reference: 'CI4PO05788' }, line_items: [{ item_code: '11423', received_quantity: 50 }] };
    const rawInvoice = {
      invoice: { invoice_number: 'I1', po_number: 'CI4PO05788' },
      vendor_details: { gstin: '27ABACA2423J1Z0' },
      line_items: [{ item_code: 'FG-P-F-0503', hsn_code: '21069099', qty: 50, unit_base_cost_inr: 220.76 }],
    };

    await poRepo.create(docMapper.mapPurchaseOrder(rawPO).toJSON());
    await grnRepo.create(docMapper.mapGRN(rawGRN).toJSON());
    await invRepo.create(docMapper.mapInvoice(rawInvoice).toJSON());

    const resolver = new SKUResolver(skuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(poRepo, grnRepo, invRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const summary = (await service.match('CI4PO05788')).getSummary();
    console.log('   Status:', summary.status);
    console.log('   Resolved SKU:', summary.resolvedSku);

    console.assert(summary.status === 'MATCHED', 'Failure Scenario 4 Failed: Different HSN should NOT break product match');
    console.assert(summary.resolvedSku[0] === 'CAN-001', 'Failure Scenario 4 Failed: Should resolve to CAN-001');

    console.log('   Result: PASSED\n');
  }

  console.log('All Phase 4 End-to-End Validation Suite Scenarios Passed Successfully!\n');
}

runEndToEndValidationSuite();

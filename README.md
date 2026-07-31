# Three-Way Match Engine

Production-ready, Domain-Driven Design (DDD) Node.js + Express backend service for automated Three-Way Match Reconciliation between Purchase Orders (PO), Goods Received Notes (GRN), and Invoices.

---

## Project Overview

### What is a Three-Way Match Engine?
In enterprise procurement and accounts payable (AP), **Three-Way Matching** is a control procedure that cross-references three key commercial documents before approving a supplier invoice for payment:

1. **Purchase Order (PO)**: Issued by the buyer to the supplier specifying agreed SKUs, ordered quantities, unit prices, and payment terms.
2. **Goods Received Note (GRN)**: Generated at the buyer's warehouse upon physical receipt of goods, recording actual received quantities and rejected items.
3. **Invoice**: Issued by the supplier requesting payment for billed line items, unit rates, and totals.

### Business Problem Solved
Manual accounts payable verification is error-prone, slow, and vulnerable to:
- Overbilling and unit price discrepancies.
- Paying for goods that were never received or were damaged/rejected.
- Duplicate invoice processing.
- Vendor disputes and delayed payment penalties.

The **Three-Way Match Engine** automates this verification pipeline, applying configurable reconciliation rules to detect quantity and price variances automatically.

---

## Architecture

```
                               ┌─────────────────────────┐
                               │       HTTP Client       │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │       Express App       │
                               └────────────┬────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
                    ▼                                               ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │    Document Upload API      │                 │       Matching API          │
     │ POST /api/v1/documents/upload│                 │   GET /api/v1/match/:po     │
     └──────────────┬──────────────┘                 └──────────────┬──────────────┘
                    │                                               │
                    ▼                                               ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │       DocumentService       │                 │       MatchingService       │
     └──────────────┬──────────────┘                 └──────────────┬──────────────┘
                    │                                               │
                    ▼                                               ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │        ParserFactory        │                 │      DocumentAggregator     │
     └───────┬─────────────┬───────┘                 └──────────────┬──────────────┘
             │             │                                        │
             ▼             ▼                                        ▼
   ┌───────────┐ ┌───────────────────┐               ┌─────────────────────────────┐
   │MockParser │ │GeminiDocumentParser│              │     LineItemAggregator      │
   └─────┬─────┘ └─────────┬─────────┘               └──────────────┬──────────────┘
         │                 │                                        │
         └────────┬────────┘                                        ▼
                  │                                  ┌─────────────────────────────┐
                  ▼                                  │         RuleEngine          │
     ┌─────────────────────────────┐                 │ ┌─────────────────────────┐ │
     │       DocumentMapper        │                 │ │ MissingDocumentRule     │ │
     └────────────┬────────────────┘                 │ │ QuantityRule            │ │
                  │                                  │ │ PriceRule               │ │
                  ▼                                  │ │ ToleranceRule           │ │
     ┌─────────────────────────────┐                 │ └─────────────────────────┘ │
     │      DocumentValidator      │                 └──────────────┬──────────────┘
     └────────────┬────────────────┘                                │
                  │                                                 ▼
                  ▼                                  ┌─────────────────────────────┐
     ┌─────────────────────────────┐                 │        ResultBuilder        │
     │        Repositories         │                 └──────────────┬──────────────┘
     │ (PO, GRN, Invoice Repos)    │                                │
     └────────────┬────────────────┘                                ▼
                  │                                  ┌─────────────────────────────┐
                  ▼                                  │    MatchResult (Domain)     │
     ┌─────────────────────────────┐                 └─────────────────────────────┘
     │           MongoDB           │
     └─────────────────────────────┘
```

---

## Folder Structure

```
three-way-match-engine/
├── src/
│   ├── config/
│   │   ├── env.js                # Single-load frozen environment config & startup validations
│   │   └── db.js                 # Mongoose connection manager with graceful shutdown
│   ├── domain/                   # Pure Domain-Driven Design (DDD) entities & value objects
│   │   ├── PurchaseOrder.js      # PO Aggregate Root with frozen identity
│   │   ├── GRN.js                # GRN Aggregate Root & GRNLineItem value objects
│   │   ├── Invoice.js            # Invoice Aggregate Root & InvoiceLineItem value objects
│   │   ├── SKU.js                # SKU Entity with price tolerance band logic
│   │   └── MatchResult.js        # MatchResult Aggregate Root & MatchStatus constants
│   ├── models/                   # Persistence-only Mongoose schemas and indexes
│   │   ├── PurchaseOrderModel.js # PO collection schema & indexes
│   │   ├── GRNModel.js           # GRN collection schema & compound indexes
│   │   ├── InvoiceModel.js       # Invoice collection schema & indexes
│   │   ├── SKUModel.js           # SKU collection schema with unique & sparse indexes
│   │   └── AuditModel.js         # Immutable append-only audit trail schema
│   ├── repositories/             # Data access layer (lean CRUD operations)
│   │   ├── PurchaseOrderRepository.js
│   │   ├── GRNRepository.js
│   │   ├── InvoiceRepository.js
│   │   ├── SKURepository.js
│   │   └── AuditRepository.js
│   ├── modules/
│   │   ├── document/             # Document ingestion module
│   │   │   ├── controller/       # DocumentController (multipart HTTP handler)
│   │   │   ├── mapper/           # DocumentMapper (raw parser output → canonical domain)
│   │   │   ├── parser/           # DocumentParser abstract base, Mock, Gemini, & ParserFactory
│   │   │   ├── routes/           # DocumentRoutes (POST /api/v1/documents/upload)
│   │   │   ├── service/          # DocumentService (parse → map → validate → persist)
│   │   │   └── validator/        # DocumentValidator (domain business validation)
│   │   └── matching/             # Core Reconciliation Engine
│   │       ├── aggregator/       # DocumentAggregator & LineItemAggregator
│   │       ├── builder/          # ResultBuilder
│   │       ├── controller/       # MatchingController (GET /api/v1/match/:poNumber)
│   │       ├── routes/           # MatchingRoutes
│   │       ├── rules/            # MissingDocumentRule, QuantityRule, PriceRule, ToleranceRule, RuleEngine
│   │       └── service/          # MatchingService orchestrator
│   └── shared/
│       └── logger.js             # Singleton Winston console logger with timestamp & colorization
├── tests/
│   ├── integration/              # Pipeline and API integration test suites
│   └── unit/                     # Standalone rule, domain, and parser unit tests
├── .env.example                  # Environment configuration template
├── package.json
├── README.md
└── src/server.js                 # Production server bootstrap entry point
```

---

## Matching Workflow

When a user calls `GET /api/v1/match/:poNumber`:

1. **HTTP Validation (`MatchingController`)**: Validates the `poNumber` parameter. Returns `404 PO_NOT_FOUND` if the PO does not exist.
2. **Document Aggregation (`DocumentAggregator`)**: Queries MongoDB repositories in parallel to fetch the `PurchaseOrder`, all associated `GRNs`, and `Invoices`.
3. **Line Item Aggregation (`LineItemAggregator`)**: Merges line items by SKU code across multiple GRNs and Invoices, calculating total `orderedQuantity`, `receivedQuantity`, `invoicedQuantity`, `orderedPrice`, and `invoicePrice`.
4. **Rule Engine Execution (`RuleEngine`)**: Runs all registered business rules sequentially, collecting all results without short-circuiting.
5. **Result Building (`ResultBuilder`)**: Evaluates all rule outcomes, assigns the final status (`MATCHED` or `MISMATCHED`), populates descriptive reason strings, and returns an immutable `MatchResult` domain object.

---

## Rules Implemented

| Rule | Class | Description | Failure Code | Severity |
|---|---|---|---|---|
| **Missing Document** | `MissingDocumentRule` | Verifies that PO, GRNs, and Invoices all exist for the given PO reference. | `PO_NOT_FOUND`<br>`GRN_NOT_FOUND`<br>`INVOICE_NOT_FOUND` | `ERROR` |
| **Quantity Match** | `QuantityRule` | Ensures `orderedQuantity == receivedQuantity` and `receivedQuantity == invoicedQuantity` per SKU. | `QUANTITY_MISMATCH` | `ERROR` |
| **Price Match** | `PriceRule` | Ensures exact equality between `orderedPrice` and `invoicePrice` per SKU. | `PRICE_MISMATCH` | `ERROR` |
| **Price Tolerance** | `ToleranceRule` | Verifies that percentage unit price variation `(abs(invoicePrice - orderedPrice) / orderedPrice * 100)` is within allowed tolerance (default 2%). | `PRICE_TOLERANCE_EXCEEDED` | `WARNING` |

---

## API Endpoints

### 1. Upload Document
Uploads a PDF or image file (Purchase Order, GRN, or Invoice).

- **Endpoint**: `POST /api/v1/documents/upload`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Document file (PDF, PNG, JPG, WEBP)
  - `documentType`: `PURCHASE_ORDER` | `GRN` | `INVOICE`

#### cURL Example
```bash
curl -X POST http://localhost:5000/api/v1/documents/upload \
  -F "file=@/path/to/purchase_order.pdf" \
  -F "documentType=PURCHASE_ORDER"
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "_id": "66ab8e9f1a2b3c4d5e6f7a8b",
    "poNumber": "PO-2024-0001",
    "issueDate": "2024-01-15T00:00:00.000Z",
    "currency": "USD",
    "buyer": {
      "name": "Acme Corp",
      "address": "123 Buyer Street, New York, NY 10001",
      "taxId": "US-TAX-123456"
    },
    "supplier": {
      "name": "Global Supplies Ltd",
      "address": "456 Supplier Ave, Los Angeles, CA 90001",
      "taxId": "US-TAX-654321"
    },
    "lineItems": [
      {
        "lineNumber": 1,
        "sku": "SKU-WIDGET-001",
        "description": "Blue Widget",
        "quantity": 100,
        "unitPrice": 9.99,
        "totalPrice": 999.0
      }
    ],
    "totalAmount": 999.0,
    "paymentTerms": "Net 30",
    "createdAt": "2026-07-31T12:00:00.000Z",
    "updatedAt": "2026-07-31T12:00:00.000Z"
  }
}
```

---

### 2. Execute Three-Way Match
Performs three-way reconciliation for a given Purchase Order number.

- **Endpoint**: `GET /api/v1/match/:poNumber`

#### cURL Example
```bash
curl -X GET http://localhost:5000/api/v1/match/PO-2024-0001
```

#### Success Response (`200 OK` — Perfect Match)
```json
{
  "success": true,
  "data": {
    "poNumber": "PO-2024-0001",
    "grnNumber": "GRN-2024-0001",
    "invoiceNumber": "INV-2024-0001",
    "status": "MATCHED",
    "reasons": [
      "All three-way reconciliation rules passed successfully"
    ],
    "reasonCount": 1,
    "isMatched": true,
    "isResolved": false,
    "createdAt": "2026-07-31T12:00:00.000Z",
    "resolvedAt": null
  }
}
```

#### Error Response (`404 Not Found` — PO Missing)
```json
{
  "success": false,
  "errors": [
    {
      "code": "PO_NOT_FOUND",
      "message": "Purchase Order \"PO-9999-MISSING\" not found"
    }
  ]
}
```

---

## Environment Variables

Configure environment variables in `.env` (refer to `.env.example`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | **Yes** | — | Server HTTP port (e.g. `5000`) |
| `NODE_ENV` | **Yes** | — | Execution environment (`development`, `production`, `test`) |
| `MONGODB_URI` | **Yes** | — | MongoDB connection URI string |
| `JWT_SECRET` | **Yes** | — | Secret string for JWT verification |
| `USE_GEMINI` | No | `false` | Set to `true` to use `GeminiDocumentParser`, `false` for `MockDocumentParser` |
| `UPLOAD_DIRECTORY` | No | `./uploads` | Storage path for uploaded document files |
| `GEMINI_API_KEY` | No | `null` | API Key for Google Gemini REST API |

---

## Running Locally

### Prerequisites
- **Node.js**: `v22.x` or higher
- **MongoDB**: Local instance running on `mongodb://localhost:27017` or MongoDB Atlas URI

### Installation & Startup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and configure values
cp .env.example .env

# 3. Start development server with nodemon
npm run dev

# 4. Run test suites
npm test
```

---

## Example Matching Result

### Mismatched Scenario Example (`200 OK`)
When quantity or price discrepancies are detected:

```json
{
  "success": true,
  "data": {
    "poNumber": "PO-2024-0002",
    "grnNumber": "GRN-2024-0002",
    "invoiceNumber": "INV-2024-0002",
    "status": "MISMATCHED",
    "reasons": [
      "[QUANTITY_MISMATCH] Quantity mismatch for SKU SKU-WIDGET-001: ordered 100, received 90, invoiced 90",
      "[PRICE_TOLERANCE_EXCEEDED] Price tolerance exceeded for SKU SKU-GADGET-002: difference is 5% (allowed 2%)"
    ],
    "reasonCount": 2,
    "isMatched": false,
    "isResolved": false,
    "createdAt": "2026-07-31T12:00:00.000Z",
    "resolvedAt": null
  }
}
```

---

## Future Improvements

1. **Vendor SKU Cross-Referencing & Resolution**: Implement alias mapping to resolve vendor-specific part numbers to canonical internal SKU codes.
2. **Duplicate Document Detection**: Add rules to check for duplicate invoice submissions across different PO references.
3. **Asynchronous Queue Processing**: Offload heavy document parsing and OCR tasks to background worker queues (e.g. BullMQ with Redis).
4. **OCR Confidence Scoring & Manual Exception Queue**: Surface low-confidence field extractions for human-in-the-loop review before reconciliation execution.

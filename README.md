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
     └────────────┬────────────────┘                 │ │ DuplicateRule           │ │
                  │                                  │ │ QuantityRule            │ │
                  ▼                                  │ │ PriceRule               │ │
     ┌─────────────────────────────┐                 │ │ ToleranceRule           │ │
     │      DocumentValidator      │                 │ └─────────────────────────┘ │
     └────────────┬────────────────┘                 └──────────────┬──────────────┘
                  │                                                 │
                  ▼                                                 ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │        Repositories         │                 │        ResultBuilder        │
     │ (PO, GRN, Invoice Repos)    │                 └──────────────┬──────────────┘
     └────────────┬────────────────┘                                │
                  │                                                 ▼
                  ▼                                  ┌─────────────────────────────┐
     ┌─────────────────────────────┐                 │    MatchResult (Domain)     │
     │           MongoDB           │                 └─────────────────────────────┘
     └─────────────────────────────┘
```

---

## Folder Structure

```
three-way-match-engine/
├── src/
│   ├── config/
│   │   ├── env.js                # Single-load frozen environment config & startup validations
│   │   └── db.js                 # Mongoose connection manager & auto index synchronization
│   ├── domain/                   # Pure Domain-Driven Design (DDD) entities & value objects
│   │   ├── PurchaseOrder.js      # PO Aggregate Root with frozen identity
│   │   ├── GRN.js                # GRN Aggregate Root & GRNLineItem value objects
│   │   ├── Invoice.js            # Invoice Aggregate Root & InvoiceLineItem value objects
│   │   ├── SKU.js                # SKU Entity with price tolerance band logic
│   │   └── MatchResult.js        # MatchResult Aggregate Root & MatchStatus constants
│   ├── models/                   # Persistence-only Mongoose schemas and indexes
│   │   ├── PurchaseOrderModel.js # PO collection schema & non-unique indexes
│   │   ├── GRNModel.js           # GRN collection schema & non-unique indexes
│   │   ├── InvoiceModel.js       # Invoice collection schema & non-unique indexes
│   │   ├── SKUModel.js           # SKU collection schema with unique & sparse indexes
│   │   └── AuditModel.js         # Immutable append-only audit trail schema
│   ├── repositories/             # Data access layer (lean CRUD operations)
│   │   ├── PurchaseOrderRepository.js
│   │   ├── GRNRepository.js
│   │   ├── InvoiceRepository.js
│   │   ├── SKURepository.js
│   │   └── AuditRepository.js
│   ├── modules/
│   │   ├── auth/                 # Authentication module (POST /auth/login)
│   │   ├── document/             # Document ingestion module
│   │   ├── matching/             # Core Reconciliation Engine
│   │   ├── sku/                  # SKU Master CRUD & SKUResolver
│   │   └── summary/              # Summary Dashboard module
│   └── shared/
│       └── logger.js             # Singleton Winston console logger
├── tests/                        # Unit and integration test suites
├── postman/                      # Postman v2.1 importable API collection
├── bruno/                        # Bruno importable API collection
├── .env.example
├── package.json
├── README.md
└── src/server.js                 # Production server entry point
```

---

## Supported Document Types

The document upload endpoint `POST /api/v1/documents/upload` enforces strict MIME type validation at the upload boundary.

### Allowed MIME Types:
- `application/pdf` (`.pdf`)
- `image/png` (`.png`)
- `image/jpeg` (`.jpg`, `.jpeg`)

### Rejection Policy:
Any file upload with an unapproved MIME type (such as executable files `.exe`, `.sh`, `.bat`, `.zip`, `.html`, etc.) is rejected **before** parsing, mapping, validation, or persistence operations take place.

- **HTTP Status Code**: `415 Unsupported Media Type`
- **Error Response Envelope**:
```json
{
  "success": false,
  "errors": [
    {
      "code": "UNSUPPORTED_FILE_TYPE",
      "message": "Only PDF, PNG and JPEG files are supported."
    }
  ]
}
```

---

## MongoDB Index Migration

### Why Mongoose Schema Changes Alone Do Not Remove MongoDB Indexes
In Mongoose, calling `schema.index()` configures index options used during initial collection creation via MongoDB's `createIndexes()` command.

However, **MongoDB's `createIndexes()` API never drops or modifies existing indexes** in a live database collection. If a collection was created with `idx_po_number`, `idx_grn_number`, or `idx_invoice_number` having `{ unique: true }`, simply removing `{ unique: true }` from JavaScript model files will **not** alter the index in the running MongoDB database. MongoDB will continue enforcing unique constraints, causing duplicate upload requests to fail with `MongoServerError: E11000 duplicate key error`.

### Automatic Application Startup Migration
To solve this seamlessly, `src/config/db.js` runs `Model.syncIndexes()` automatically upon application startup. `syncIndexes()` compares current Mongoose schema definitions against live MongoDB indexes, automatically dropping any legacy unique indexes that no longer match the schema.

### Manual DBA Migration Script (`mongosh`)
If manual migration is preferred or if auto-indexing is disabled in production environments, connect to MongoDB via `mongosh` and execute:

```javascript
use three_way_match_db

// 1. Drop legacy unique indexes on document collections
db.purchase_orders.dropIndex("idx_po_number")
db.grns.dropIndex("idx_grn_number")
db.invoices.dropIndex("idx_invoice_number")

// 2. Re-create non-unique indexes for fast lookup without unique constraints
db.purchase_orders.createIndex({ poNumber: 1 }, { name: "idx_po_number" })
db.grns.createIndex({ grnNumber: 1 }, { name: "idx_grn_number" })
db.invoices.createIndex({ invoiceNumber: 1 }, { name: "idx_invoice_number" })
```

Once dropped, duplicate uploads are persisted cleanly in MongoDB while `DuplicateRule` in the `RuleEngine` detects duplicate documents during matching and surfaces `DUPLICATE_PO`, `DUPLICATE_GRN`, or `DUPLICATE_INVOICE` reason codes.

---

## Matching Workflow

When a user calls `GET /api/v1/match/:poNumber`:

1. **HTTP Validation (`MatchingController`)**: Validates the `poNumber` parameter. Returns `404 PO_NOT_FOUND` if the PO does not exist.
2. **Document Aggregation (`DocumentAggregator`)**: Queries MongoDB repositories in parallel to fetch the `PurchaseOrder`, all associated `GRNs`, and `Invoices`.
3. **Line Item Aggregation (`LineItemAggregator`)**: Merges line items by SKU code across multiple GRNs and Invoices using `SKUResolver`, calculating total `orderedQuantity`, `receivedQuantity`, `invoicedQuantity`, `orderedPrice`, and `invoicePrice`.
4. **Rule Engine Execution (`RuleEngine`)**: Runs all registered business rules sequentially (`MissingDocumentRule`, `DuplicateRule`, `QuantityRule`, `PriceRule`, `ToleranceRule`), collecting all results without short-circuiting.
5. **Result Building (`ResultBuilder`)**: Evaluates all rule outcomes, assigns final status (`MATCHED` or `MISMATCHED`), populates descriptive reason strings, warnings, and item-level results, returning an immutable `MatchResult` domain object.

---

## Rules Implemented

| Rule | Class | Description | Failure Code | Severity |
|---|---|---|---|---|
| **Missing Document** | `MissingDocumentRule` | Verifies that PO, GRNs, and Invoices all exist for the given PO reference. | `PO_NOT_FOUND`<br>`GRN_NOT_FOUND`<br>`INVOICE_NOT_FOUND` | `ERROR` |
| **Duplicate Document** | `DuplicateRule` | Detects duplicate POs, GRNs, or Invoices uploaded for the same reference. | `DUPLICATE_PO`<br>`DUPLICATE_GRN`<br>`DUPLICATE_INVOICE` | `WARNING` |
| **Quantity Match** | `QuantityRule` | Ensures `orderedQuantity == receivedQuantity` and `receivedQuantity == invoicedQuantity` per SKU. | `QUANTITY_MISMATCH` | `ERROR` |
| **Price Match** | `PriceRule` | Ensures exact equality between `orderedPrice` and `invoicePrice` per SKU. | `PRICE_MISMATCH` | `ERROR` |
| **Price Tolerance** | `ToleranceRule` | Verifies that percentage unit price variation `(abs(invoicePrice - orderedPrice) / orderedPrice * 100)` is within allowed tolerance (default 2%). | `PRICE_TOLERANCE_EXCEEDED` | `WARNING` |

---

## API Endpoints

### 1. Authentication (`POST /auth/login`)
- **Endpoint**: `POST /auth/login`
- **Body**: `{}`
- **Response**: `{ "success": true, "data": { "token": "static-bearer-token-3way-match-engine", "type": "Bearer" } }`

### 2. Upload Document (`POST /api/v1/documents/upload`)
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `file` (PDF/PNG/JPEG), `documentType` (`PURCHASE_ORDER` | `GRN` | `INVOICE`)

### 3. List Documents (`GET /api/v1/documents`)
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Query Params**: `documentType` (optional), `poNumber` (optional)

### 4. Execute Three-Way Match (`GET /api/v1/match/:poNumber`)
- **Headers**: `Authorization: Bearer <TOKEN>`

---

## Environment Variables

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

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Start development server
npm run dev

# 4. Run test suites
npm test
```

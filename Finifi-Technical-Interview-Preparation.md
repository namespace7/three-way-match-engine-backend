# Finifi Technical Interview Preparation Handbook
## Three-Way Match Engine — Backend Engineer Discussion

**STUDY ORDER**: Section 14 (Cheat Sheet) -> Section 3 (Architecture) -> Sections 4–5 (Questions) -> Section 13 (Mock Interview) -> Section 15 (Last 30 min)

---

# SECTION 1 — Company Research

## What Finifi Does

Finifi is a **B2B FinTech company** focused on **intelligent accounts payable (AP) and procurement automation**. Core mission: eliminate manual invoice processing errors, payment fraud, and supplier disputes using intelligent document matching.

| Business Problem | Impact |
|---|---|
| Duplicate invoice payments | Direct financial loss |
| Price mismatch / overpayment | Vendor fraud risk |
| GRN vs PO quantity discrepancy | Inventory shrinkage |
| Slow AP cycle times | Cash flow strain |
| Manual 3-way match | Human error, headcount cost |
| Missing / inactive SKU | Rogue purchasing detection |

## How Your Assignment Aligns

Your assignment **is Finifi's core product** — a Three-Way Match Engine that:
1. Ingests POs, GRNs, and Invoices via PDF
2. Uses OCR (Gemini AI) to parse unstructured documents into structured data
3. Applies a rule engine with 7 configurable financial rules
4. Produces an AP recommendation (Approve / Flag / Hold)

---

# SECTION 2 — Project Walkthrough

## 5-Minute Pitch
"The Three-Way Match Engine automates a critical accounts payable workflow. Before a company pays a supplier invoice, someone needs to verify it matches what was ordered (Purchase Order) and what was actually received (Goods Received Note). Doing this manually is slow and error-prone. My system accepts PDF uploads for POs, GRNs, and Invoices, uses OCR to extract structured data, runs a rule engine checking seven financial and quantity rules — price mismatch, duplicate detection, inventory rejection — and outputs a reconciliation result with an AP recommendation: Approve, Flag for Review, or Hold. Tech stack: Node.js, Express, MongoDB, Gemini AI for OCR. Deployed on Render."

## 10-Minute Technical Walk-through
Add after the 5-min pitch:
- **Architecture**: Feature-based Node.js monolith. Organized by domain: auth, document, matching, sku.
- **Document Pipeline**: Multer -> DocumentService -> Gemini Parser (Strategy pattern) -> MongoDB.
- **Matching Engine**: SKUResolver (canonical SKU) -> LineItemAggregator (merge multi-GRN/Invoice) -> RuleEngine (7 rules) -> ResultBuilder (AP recommendation).
- **Why MongoDB**: Variable document schemas (vendor POs differ wildly). Embedded arrays for line items. Flexible schema without migrations.
- **Key decision — TanStack Query over Redux**: 95% of state is server state. TanStack Query provides caching, refetching, loading/error states without Redux boilerplate.

## 15-Minute Deep Dive
Add after 10-min:
- **SKU Master**: Canonical product catalogue. PO might say "PSM-MOMOS-24", invoice uses EAN "8901234567890". Both resolve to canonical SKU "11423".
- **Deployment Challenge**: Render ephemeral filesystem. Files uploaded to disk are wiped on container restart. MongoDB metadata persists but PDF is gone. Production fix: AWS S3 or GCS.
- **What I'd change**: Async OCR with BullMQ, S3 for file storage, proper JWT + RBAC, 90%+ test coverage.

---

# SECTION 3 — Architecture

## System Flow Diagram

```
FRONTEND (Next.js + TanStack Query)
        |
        | HTTP REST
        v
BACKEND (Express.js)
  app.js: helmet | cors | morgan | body-parser
        |
  [Auth Middleware - Bearer Token]
        |
  +-----+------+--------+--------+
  |            |        |        |
  Auth    Document   Match    SKU
  routes   routes   routes  routes
                |        |
          [Multer]        |
                |        |
         [DocController] |
                |        |
         [DocService]    |
                |        |
         [OCR Parser]    |
          Gemini/Mock    |
                |        |
                v        v
          MONGODB (Atlas)
          purchase_orders | grns | invoices | skus
                          |
                    [Match Engine]
                          |
               [SKU Resolver]
                          |
               [LineItemAggregator]
                          |
               [RuleEngine - 7 rules]
                          |
               [ResultBuilder]
                          |
               AP Recommendation
```

## The 7 Matching Rules

| Rule | Severity | Trigger |
|---|---|---|
| DUPLICATE_INVOICE | FAIL | Same invoiceNumber > 1x |
| DUPLICATE_GRN | FAIL | Same grnNumber > 1x |
| PO_GRN_QUANTITY_MISMATCH | WARN | received < ordered |
| INVOICE_GRN_MISMATCH | WARN | invoiced != received |
| PRICE_MISMATCH | FAIL | delta > tolerance% |
| MISSING_SKU | FAIL | SKU not in master |
| INACTIVE_SKU | FAIL | SKU.isActive === false |
| INVENTORY_REJECTION | WARN | rejectedQty > 0 |

**AP Logic**: All PASS = APPROVE | Any WARN = FLAG | Any FAIL = HOLD

**Financial Exposure** = (invoicedQty - receivedQty) × invoicePrice

---

# SECTION 4 — Backend Questions (100)

## Node.js Core

**Q1. Why Node.js?**
Ideal for I/O-heavy workloads — file reads, DB calls, external API calls (Gemini OCR). Non-blocking event loop handles concurrency without spawning threads per request.

**Q2. What is the Event Loop?**
Mechanism for non-blocking I/O. Phases: Timers -> I/O callbacks -> Poll -> Check (setImmediate) -> Close callbacks. Microtasks (Promise.then, nextTick) run between each phase.

**Q3. process.nextTick() vs setImmediate()?**
nextTick: runs before the event loop continues (microtask queue, higher priority). setImmediate: runs in the Check phase of the next event loop iteration.

**Q4. How does async/await work?**
Syntactic sugar over Promises. async function returns a Promise. await suspends execution and yields to the event loop until the awaited Promise resolves. Implemented using generator functions internally.

**Q5. Promise.all vs Promise.allSettled?**
Promise.all rejects immediately if any promise rejects. Promise.allSettled waits for all, returning {status, value/reason} for each — use when you need results from all even if some fail.

**Q6. What are Streams?**
Objects for reading/writing data in chunks. Types: Readable, Writable, Duplex, Transform. res.sendFile() creates a Readable stream piped to HTTP response — memory efficient for large PDFs.

**Q7. What is backpressure?**
When a writable stream can't consume data as fast as readable produces it. pipe() handles this automatically by pausing the readable when writable buffer is full.

## Express.js

**Q8. Why Express over NestJS?**
Express: minimal, battle-tested, full control. NestJS: opinionated DI containers, decorators — overhead without benefit for this project size. I implemented my own clean architecture via constructor injection.

**Q9. How does Express middleware work?**
Function with (req, res, next). Reads/modifies request/response, calls next() to proceed or next(err) to pass to error handler. Order of app.use() calls is critical.

**Q10. What is express-async-errors?**
Without it, unhandled promise rejections in async handlers don't trigger Express error handler — they crash the process. It patches Express to forward async errors to next(err) automatically.

**Q11. Your middleware stack order?**
1. helmet() 2. cors() 3. express.json() 4. morgan 5. auth middleware 6. route handlers 7. error handler.

**Q12. What does Helmet do?**
Sets 11+ HTTP security headers: X-Frame-Options (clickjacking), X-Content-Type-Options (MIME sniffing), Content-Security-Policy, Strict-Transport-Security (HSTS), removes X-Powered-By.

**Q13. Error handling middleware signature?**
(err, req, res, next) — 4 arguments. Triggered when any middleware calls next(err) or throws (with express-async-errors). Returns: { success: false, errors: [{code, message}] }.

## Multer & Upload

**Q14. How does Multer work?**
Middleware for multipart/form-data. Uses busboy to parse multipart boundary. Routes file data to storage engine (disk or memory). Populates req.file with metadata.

**Q15. diskStorage vs memoryStorage?**
diskStorage writes to disk. memoryStorage holds as Buffer in memory. We use diskStorage because PDFs up to 10MB would exhaust RAM under concurrent load.

**Q16. The upload regression bug?**
Destination callback passed relative path './uploads'. When process working directory differed, files were written to incorrect relative path. Fix: path.resolve('./uploads') in the destination callback — absolute path guaranteed.

**Q17. Why store file path in MongoDB, not the file itself?**
Storing binary PDFs increases document sizes, slows queries, hits 16MB BSON limit. Storing path keeps documents small; filesystem serves files efficiently. Production: S3 URL instead of path.

**Q18. How would you move to S3?**
Replace multer.diskStorage() with multer-s3 adapter. File stream goes directly to S3 bucket. Store req.file.location (S3 URL) in MongoDB instead of local path. Zero business logic changes needed.

## Authentication

**Q19. Authentication vs authorization?**
Authentication: verify who you are (token validation). Authorization: verify what you can do (RBAC, permissions). Our system: authentication only — every authenticated user has full access.

**Q20. What is a JWT?**
JSON Web Token. Structure: header.payload.signature. Signature = HMAC-SHA256(header + payload, secret). Server verifies signature without storing session state. Stateless.

**Q21. Stateful vs stateless auth?**
Stateful (sessions): server stores session in memory/Redis, client sends session ID. Stateless (JWT): server signs token, client sends on every request, server verifies signature. Stateless scales horizontally without shared session storage.

**Q22. JWT risks?**
(1) Token theft — attacker has full access until expiry. (2) No server-side revocation without a blocklist. (3) Payload is base64-encoded, NOT encrypted — never store sensitive data in payload.

**Q23. Production JWT implementation?**
1. Login: jwt.sign({userId, role}, secret, {expiresIn: '15m'}) -> access token
2. Issue refresh token (long-lived, httpOnly cookie)
3. Every request: verify access token signature and expiry
4. On 401: use refresh token to get new access token
5. On logout: add refresh token to Redis blocklist

## MongoDB

**Q24. Why MongoDB over PostgreSQL?**
AP document schemas vary significantly between vendors. Variable line item counts (2 to 500). MongoDB embedded arrays handle this without schema migrations. If data were highly relational with strict consistency -> PostgreSQL.

**Q25. The E11000 duplicate key error?**
MongoDB's unique constraint violation code. Triggered when inserting multiple SKUs with eanCode: null before the partial index was implemented. Fix: partialFilterExpression that enforces uniqueness only for non-null EAN codes.

**Q26. What is the aggregation pipeline?**
Series of stages processing documents sequentially: $match (filter), $group (aggregate), $lookup (join), $project (reshape), $sort, $limit. More powerful than find() for analytics and cross-collection operations.

**Q27. Embedding vs referencing?**
Embed: data co-located, fast reads, bounded size, always accessed together. Reference: ObjectId + $lookup, for large or independently accessed data. We embed line items — bounded, always co-accessed with the parent document.

**Q28. What is lean() in Mongoose?**
.lean() returns plain JavaScript objects instead of full Mongoose documents. 2-3x faster (skips document instantiation) but no Mongoose methods (save(), virtuals). Use for read-only queries.

**Q29. What is $lookup?**
Left outer join: { $lookup: { from: 'skus', localField: 'skuCode', foreignField: 'skuCode', as: 'skuDetails' } }. Returns matching documents from foreign collection embedded in result.

**Q30. Types of MongoDB indexes?**
Single field, Compound, Multikey (on arrays), Text, Geo, Hashed (for sharding), Sparse (skip nulls), Partial (conditional filter), TTL (auto-expire), Unique.

## Performance & Scaling

**Q31. How would you scale this Express app?**
1. Horizontal scaling: multiple instances behind a load balancer
2. PM2 cluster mode: one process per CPU core
3. Stateless design: our stateless auth allows any instance to handle any request
4. Redis caching: cache SKU Master lookups (rarely changed)

**Q32. What is PM2?**
Production process manager: cluster mode, auto-restart on crash, log management, monitoring dashboard, zero-downtime deploys, environment management.

**Q33. What causes memory leaks in Node.js?**
(1) Closures holding references to large objects (2) Global variable accumulation (3) Event listener accumulation (4) Unbounded caches. Detect with process.memoryUsage() or Node Inspector heap snapshots.

**Q34. What is connection pooling in Mongoose?**
Mongoose maintains pool of persistent MongoDB connections (default 5). Incoming requests reuse connections rather than establishing new TCP connection per request.

**Q35. path.resolve() vs path.join()?**
path.resolve() resolves to absolute path from right to left — guaranteed absolute. path.join() joins path segments with OS separator but doesn't resolve to absolute. Use path.resolve() when you need a guaranteed absolute path.

**Q36. What is graceful shutdown?**
On SIGTERM: stop accepting new connections, allow in-flight requests to complete, close DB connections, then exit. server.close(callback) in Node.

**Q37. How do you implement rate limiting?**
express-rate-limit middleware. Sliding window: 100 requests per 15 minutes per IP. For distributed systems, use Redis store so limits are shared across instances. Stricter limits for auth endpoints.

**Q38. What is the difference between 401 and 403?**
401 Unauthorized: authentication required or invalid — "you haven't logged in". 403 Forbidden: authentication succeeded but no permission — "logged in but not allowed".

**Q39. Idempotency — which HTTP methods are idempotent?**
GET, PUT, DELETE, HEAD are idempotent (same result on repeat). POST is not. PATCH is technically not idempotent unless carefully designed.

**Q40. Why use Buffer.from(file).toString('base64')?**
Buffer is Node's representation of binary data. Gemini API requires base64-encoded file content in JSON request body. Base64 increases size ~33% vs original binary.

## Error Handling (Q41-Q50)

**Q41. Error response format?**
{ "success": false, "errors": [{ "code": "DOCUMENT_NOT_FOUND", "message": "Document with ID xyz not found" }] }

**Q42. HTTP status codes you use?**
200 OK, 201 Created, 400 Bad Request (validation), 401 Unauthorized, 404 Not Found, 409 Conflict, 415 Unsupported Media Type, 500 Internal Server Error.

**Q43. How do you handle async errors in Express?**
express-async-errors patches Express to catch rejected Promises in route handlers and forward them to next(err). Our global error handler formats and returns appropriate HTTP response.

**Q44. How do you avoid crashing on uncaught exceptions?**
process.on('uncaughtException', ...) and process.on('unhandledRejection', ...). Log the error and gracefully exit. A process manager (PM2, Docker restart policy) restarts the process.

**Q45. What is 'use strict'?**
Enables strict mode: prevents undeclared variables, disables duplicate parameter names, makes this in non-method functions undefined instead of global object.

**Q46. What are environment variables?**
Configuration values set outside application code: PORT, MONGODB_URI, JWT_SECRET. In Render, set via dashboard. In Docker, via --env flag. Never hardcode secrets in source code.

**Q47. What is a health check endpoint?**
GET /health returns { status: 'ok', uptime: 123.4 }. Load balancers and container orchestrators call this to route traffic only to healthy instances.

**Q48. What is the difference between synchronous and asynchronous file operations?**
Synchronous (fs.readFileSync): blocks the event loop — use only at startup (config loading). Asynchronous (fs.promises.readFile): doesn't block, event loop handles other requests while I/O completes.

**Q49. How do you implement pagination?**
Accept page and limit query params. skip = (page - 1) * limit. Use .skip(skip).limit(limit). Return { data, meta: { page, limit, total, totalPages } }.

**Q50. What is a Mongoose schema?**
Defines document structure, field types, defaults, validators, and indexes. Mongoose enforces these at the ODM layer. Models are compiled from schemas. db.collection.createIndex is called automatically on model compilation.

## Additional Backend Q51-Q100 (condensed)

Q51: Event loop phases in detail: Timers -> Pending callbacks -> Idle/Prepare -> Poll (blocks) -> Check (setImmediate) -> Close callbacks.

Q52: What is a Promise? Represents eventual completion or failure of an async operation. Chainable (.then().catch()), composable (Promise.all), avoids callback hell.

Q53: What is a stream pipe? readable.pipe(writable) — forwards chunks from readable to writable, handling backpressure automatically.

Q54: What is the cluster module? Master process forks one worker per CPU. Workers share the server port via IPC. OS distributes connections between workers.

Q55: What is CORS? Browser security mechanism preventing scripts from making requests to a different origin. cors() middleware adds Access-Control-Allow-Origin headers.

Q56: What is bcrypt? Adaptive hashing algorithm. Adds random salt (prevents rainbow tables), applies many rounds of Blowfish cipher. Cost factor increases computation time exponentially.

Q57: What is HSTS? Strict-Transport-Security header forces browsers to use HTTPS for all future requests to the domain for a specified period.

Q58: What is input validation? Check all incoming data: required fields present, correct types, allowed enum values. Libraries: joi, zod, express-validator. Our validation is inline in controllers/services.

Q59: What is the difference between GET and POST? GET: retrieve data, idempotent, params in URL, cacheable. POST: create/process data, not idempotent, body in request, not cached.

Q60: What is API versioning? Allows breaking changes in new version without breaking existing clients. /api/v1 prefix versioning — most explicit and widely supported.

Q61: What is CSRF? Cross-Site Request Forgery — tricks authenticated users into submitting requests. Not a risk for Bearer-token APIs (browser doesn't auto-send Bearer headers cross-origin).

Q62: What is XSS? Cross-Site Scripting — injecting malicious scripts. React escapes output by default. CSP headers (Helmet) restrict script sources.

Q63: What is the principle of least privilege? Every process/user has minimum permissions necessary. MongoDB user has only read/write access to specific database, not cluster admin.

Q64: What is a timing attack? Infers information from time an operation takes. Use crypto.timingSafeEqual() for constant-time token comparison.

Q65: What is dependency vulnerability scanning? npm audit checks installed packages against known vulnerability database. Should be in CI/CD pipeline.

Q66: What is Docker? Containerization platform. Packages application and all dependencies into a portable image. Ensures consistent environment from dev to production.

Q67: What is docker-compose? Multi-container application definition in YAML. docker-compose up starts both Node API and MongoDB locally — replaces manual setup.

Q68: What is a reverse proxy? Nginx sits in front of Node — handles SSL termination, static file serving, load balancing. Render handles this automatically.

Q69: What is zero-downtime deployment? Deploy new version without taking service offline. Blue-green: switch traffic between identical environments. Rolling: replace instances one by one.

Q70: What is CI/CD? Continuous Integration: auto-run tests on every commit. Continuous Deployment: auto-deploy when tests pass. Tools: GitHub Actions, GitLab CI.

Q71: What is a message queue? Decouples producers from consumers. Producer puts message in queue and returns immediately. Consumer processes asynchronously. Tools: BullMQ, RabbitMQ, AWS SQS.

Q72: What is Redis? In-memory key-value store. Uses: session storage, caching SKU Master, rate limiting counters, message queue backend (BullMQ).

Q73: What is a feature flag? Configuration enabling/disabling features without deployment. USE_GEMINI=true/false switches between real and mock parser.

Q74: What is distributed tracing? Add correlationId to every request. Pass in headers through all service calls. Log with every log line. Tools: Jaeger, Zipkin, AWS X-Ray.

Q75: What is the difference between HTTP/1.1 and HTTP/2? HTTP/2: multiplexing (multiple requests over one TCP connection), header compression, server push. Reduces latency for multiple small requests.

Q76: What is the Node.js module system? CommonJS (require()/module.exports) is default. ES Modules (import/export) supported with .mjs or "type": "module" in package.json.

Q77: What is npm ci vs npm install? npm ci: uses package-lock.json exactly, fails if lock file doesn't match. Faster, reproducible for CI/CD. npm install may update lock file.

Q78: What is graceful error handling pattern? Try in async handler -> throw error object with statusCode and code -> global error handler catches it -> formats response.

Q79: What are MongoDB transactions? Multi-document ACID transactions using sessions (MongoDB 4.0+). session.withTransaction() wraps multiple operations. If any fails, session rolls back all changes.

Q80: What is a compound index? Index on multiple fields: { poNumber: 1, documentType: 1 }. Supports queries on either field or both. Field order matters for range queries and sort.

Q81: What is $unwind in aggregation? Deconstructs array field into multiple documents, one per array element. { $unwind: '$lineItems' } creates one document per line item.

Q82: What is a TTL index? Time-To-Live index automatically deletes documents after N seconds past a date field. Useful for expiring sessions, OTP codes, temporary data.

Q83: What is an explain plan? collection.find({...}).explain('executionStats') shows MongoDB's query execution — index used, documents examined vs returned, execution time. Use to diagnose slow queries.

Q84: What is bulkWrite? Executes multiple write operations in a single round trip. Ordered: stops on first error. Unordered: continues after errors. Much more efficient than individual writes.

Q85: What is a capped collection? Fixed-size collection that automatically overwrites oldest documents when it reaches size limit. Useful for logs, activity feeds.

Q86: What is $elemMatch? Matches documents where array element satisfies multiple conditions simultaneously. Without it, conditions can match across different array elements.

Q87: What is $set in updates? Updates specific fields without replacing entire document. Without $set, update replaces the entire document with only provided fields.

Q88: What is upsert? updateOne(filter, update, {upsert: true}) — creates document if no match. "Insert if not exists, update if exists."

Q89: What is read preference? Determines which replica set member reads go to: primary, primaryPreferred, secondary, secondaryPreferred, nearest. Secondary reads reduce primary load but may read stale data.

Q90: What is write concern? How many replica set members must acknowledge a write. w:1 (primary only). w:"majority" (stronger durability but higher latency).

Q91: What is a sparse index? Only indexes documents where the indexed field exists. Useful for optional fields — avoids indexing documents without the field.

Q92: What is $facet? Runs multiple aggregation pipelines on same input simultaneously. Useful for dashboard queries combining counts, sums, distributions in single DB round trip.

Q93: What is the aggregation $group stage? Groups documents by a field and applies accumulators: { $group: { _id: '$poNumber', count: { $sum: 1 }, total: { $sum: '$amount' } } }.

Q94: What is $lookup? Left outer join in aggregation. Returns matching documents from foreign collection embedded in result. Alternative to Mongoose populate() for better performance at scale.

Q95: What is a covered query? MongoDB answers entirely from the index without examining documents. Project only indexed fields — extremely fast.

Q96: How do you prevent N+1 queries? Use $lookup (join) or populate with projections instead of querying for each related item. Or batch load all related documents with $in.

Q97: What is change streams? collection.watch() emits change events in real time when documents change. Requires replica set. Alternative to polling for real-time data sync.

Q98: What is a replica set? Group of MongoDB nodes maintaining same dataset. One primary (accepts writes), multiple secondaries (replicate writes). Auto-failover if primary goes down. Atlas manages this.

Q99: What is sharding? Horizontal partitioning across multiple MongoDB instances based on shard key. Allows scaling beyond single server capacity. Complex to configure.

Q100: What is MongoDB Atlas? Managed cloud database service. Automated backups, point-in-time recovery, auto-scaling, encryption at rest, performance monitoring.

---

# SECTION 5 — Project-Specific Questions (150)

## OCR & Parsing (Q101-Q130)

Q101: How does OCR work? PDF -> base64 encode -> Gemini 1.5 Flash API -> structured JSON extraction -> validate -> map to domain models -> MongoDB.

Q102: Why Gemini Flash? Optimized for speed and cost efficiency. Supports multimodal inputs. Returns JSON reliably with structured output prompting.

Q103: What when Gemini returns garbled data? Validate response against schema. If validation fails, throw DOCUMENT_VALIDATION_ERROR. Production: trigger manual review queue.

Q104: What is MockDocumentParser? Returns deterministic fixture data for testing without Gemini API. Activated when USE_GEMINI=false. Enables full pipeline testing without API costs.

Q105: Why Strategy pattern for parsing? DocumentService._parse() selects parser at runtime based on config. Swapping parsers requires zero changes to the service. Clean separation of algorithm from client.

Q106: How do you handle UOM extraction errors (INI -> EA)? uomNormalizer.js maps known OCR artifacts (INI, IND, NOS, 1) to canonical values (EA). Applied in SKU domain model constructor.

Q107: OCR reliability challenges? Handwritten text, low-quality scans, non-standard templates, OCR artifacts, complex table layouts for line item extraction.

Q108: How to improve OCR accuracy? Pre-process PDF (deskew, denoise), domain-specific prompting (vendor templates), confidence scoring per field, human-in-the-loop for low-confidence extractions.

Q109: How would you process 10,000 invoices/day? Async with BullMQ: upload enqueues a job, workers poll queue, parse documents, store results. Horizontal scaling adds more workers.

Q110: What is the Gemini API version? v1beta with gemini-1.5-flash model via Google AI Studio API (not Vertex AI). AI Studio uses simple API key; Vertex AI requires GCP auth.

Q111: How long does OCR take? Gemini Flash: 2-8 seconds per single-page PDF. For production: async — upload returns job ID, webhook or polling delivers result.

Q112: Fallback if Gemini is unavailable? Currently: return 503 service error. Production improvement: queue for retry, circuit breaker pattern, backup OCR provider (AWS Textract).

Q113: Handle PDF encoding for API? fs.readFileSync(filePath) reads as Buffer, .toString('base64') encodes. Base64 is ~33% larger. Included in Gemini API request body.

## SKU Master & Matching (Q114-Q160)

Q114: What is the SKU Master? Authoritative product catalogue — single source of truth for product identifiers, prices, UOMs. Enables cross-document matching when same product is described differently.

Q115: Why canonical SKU codes? PO might say "PSM-MOMOS-24", invoice uses EAN "8901234567890". Both resolve to canonical SKU "11423" via SKU Master. Enables item-level matching.

Q116: What does SKU Resolver do? SKUResolver.resolve(item) takes line item with any identifier (skuCode, ean, barcode) and returns canonical SKU string via priority lookup in SKU Master.

Q117: What happens when SKU is not found? MISSING_SKU rule fires. Item flagged in result. AP recommendation downgraded. Financial exposure calculated based on invoiced amount for unresolvable item.

Q118: What is an inactive SKU? isActive: false in SKU Master — discontinued product or rogue purchase. INACTIVE_SKU rule fires, payment held pending review.

Q119: How does LineItemAggregator handle multiple GRNs? Groups by canonical SKU across all GRNs. GRN-001 received 50 + GRN-002 received 30 = aggregated receivedQuantity of 80.

Q120: How does LineItemAggregator handle multiple invoices? Similarly sums quantities by canonical SKU across all invoices. Handles split billing — one PO paid via two invoices.

Q121: How does duplicate invoice detection work? Rule engine collects all invoiceNumber values across all invoices for the PO. If any appears > 1x, DUPLICATE_INVOICE rule fires.

Q122: How is price mismatch calculated? delta = |invoicePrice - poPrice| / poPrice. If delta > priceTolerance, PRICE_MISMATCH fires. Tolerance configurable per SKU or globally.

Q123: Financial exposure calculation? (invoicedQuantity - receivedQuantity) × invoicePrice = amount being billed for goods not confirmed received.

Q124: AP recommendation logic? Worst rule verdict across all items: All PASS = APPROVE | Any WARN = FLAG FOR REVIEW | Any FAIL = HOLD.

Q125: Why separate RuleEngine from ResultBuilder? Single Responsibility Principle. RuleEngine: business logic (did rule pass?). ResultBuilder: output format. Change one without touching the other.

Q126: How would you add a new matching rule? (1) Add method to RuleEngine.js (2) Add to execution sequence (3) Add rule constant (4) Update ResultBuilder if needed (5) Write unit test.

Q127: What is feature-based architecture and why? Folders by domain: modules/{auth, document, matching, sku}. Each contains controller, service, repository, routes. Co-location reduces cognitive load. Supports team ownership.

Q128: Repository vs Service? Repository: data access layer, CRUD against database, no business logic. Service: business logic layer, orchestrates repositories, no HTTP concern.

Q129: What is a domain object? Rich object representing business entity with data AND behavior. PurchaseOrder.getItems(), SKU.isActive, Invoice.getTotal(). Business rules encapsulated independently of DB or HTTP.

Q130: How does the system detect duplicate GRNs? Rule engine collects all grnNumber values across GRN documents for the PO. If any appears > 1x, DUPLICATE_GRN rule fires.

Q131: Handle partial deliveries? receivedQuantity < orderedQuantity -> PO_GRN_QUANTITY_MISMATCH warning fires. Financial exposure calculated for shortfall.

Q132: Multi-tenant support? Add tenantId to every collection. All queries include { tenantId: req.user.tenantId }. Compound indexes on (tenantId, poNumber). Middleware injects tenantId from JWT payload.

Q133: Canonical SKU concept from? MDM (Master Data Management) — maintaining a single authoritative "golden record" for each business entity.

Q134: Audit logging? Create audit_logs collection. After every create/update/delete: insert {entity, entityId, action, userId, timestamp, diff}. Mongoose post-hooks automate this.

Q135: Handle zero unit price in invoice? PRICE_MISMATCH fires (0 vs PO price = 100% delta). Engine should validate minimum price thresholds. Zero-price invoices flagged as potentially fraudulent.

Q136: Testing the matching engine? Unit tests for each rule in isolation. Integration tests for full match flow with known fixture data. Contract tests for API response format.

Q137: Time complexity of matching algorithm? O(n × m) where n = line items, m = rules. m is constant (7 rules), so effectively O(n). Bottleneck is network I/O (MongoDB queries), not algorithm.

Q138: Handle PO with no GRN or Invoice uploaded? Engine returns result with zero received/invoiced quantities. All quantity mismatch rules fire. AP recommendation: HOLD. Represents early-stage PO.

Q139: Production matching pipeline at scale? Upload -> S3 -> SQS -> Lambda/ECS workers (Gemini + parse) -> MongoDB. Fully async, event-driven. HTTP upload returns tracking ID immediately.

Q140: What is financial exposure in context? Maximum monetary liability. GRN received 80 units but invoice claims 100 at Rs 500 each -> exposure = 20 × Rs 500 = Rs 10,000.

Q141: Why TanStack Query over Redux? 95% of state is server state. TanStack provides: automatic caching, background refetching, loading states, error states — all without manual action dispatching. Redux would add boilerplate with no benefit.

Q142: How does PDF preview work? GET /api/v1/documents/:id/file streams file using res.sendFile(). Frontend renders in iframe/embed. Browser native PDF viewer handles rendering.

Q143: INR currency formatter? src/utils/currency.ts exports formatINR(amount) using Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }). Handles Indian numbering (lakhs, crores) correctly.

Q144: Hardest bug? Multer relative path regression. Path './uploads' resolved differently when process CWD differed from project root. Files were written to wrong location. Fix: path.resolve() in destination callback.

Q145: What I'd redesign? Async document processing from day one. Currently upload blocks 2-8s waiting for Gemini. Production AP needs: upload -> return immediately -> process in background -> webhook notification.

Q146: Handling inconsistent vendor SKU codes? SKU Resolver tries multiple lookup strategies. If none match, MISSING_SKU fires. Long-term: alias table in SKU Master mapping vendor codes to canonical codes.

Q147: Webhook notifications? After matching completes, POST to configured webhook URL. axios.post(webhookUrl, result) in async try-catch. Retry with exponential backoff on failure.

Q148: Handle price in Indian format (1,50,000)? parseFloat(value.replace(/,/g, '')). Without this, 1,50,000 becomes 1 — catastrophic financial error.

Q149: Security checks on upload endpoint? (1) Auth middleware — Bearer token (2) MIME type filter — only PDF, PNG, JPEG (3) File size limit — 10MB (4) documentType validation (5) Document content validation.

Q150: Production monitoring? APM: request latency P50/P95/P99. Error rate per endpoint. MongoDB query performance. Gemini API response times. Queue depth if async. Business metrics: approval rate, processing time.

Q151-Q160 (brief answers):

Q151: Handle PO cancelled after GRN received? Add status: 'CANCELLED' to PO. Matching engine checks status -> CANCELLED_PO result -> HOLD all invoices.

Q152: What if document uploaded with wrong type? documentType validated against allowed list. Better: infer document type from content, not user input.

Q153: Largest realistic PO? 500-1000 line items max for embedded documents (16MB BSON limit). For larger, store line items in separate collection.

Q154: Handle Gemini rate limit? Exponential backoff: 1s, 2s, 4s, 8s. After N retries, fail gracefully. 429 Too Many Requests. Circuit breaker pattern for sustained outages.

Q155: Match triggered before all documents uploaded? Engine matches with available documents. Improvement: readyForMatch status requiring all three document types present.

Q156: Data consistency across three document types? poNumber is the join key. All queries filter by poNumber. Inconsistencies caught by validation layer before reaching matching engine.

Q157: Multi-currency support? Store currencyCode with every amount. Normalize to base currency for comparison. Store exchange rate at transaction time.

Q158: Real-time matching status? Server-Sent Events or WebSockets. Upload returns job ID. Client subscribes to GET /match/:jobId/status. Server streams status updates.

Q159: Description column shows SKU code instead of name? Root cause: LineItemAggregator wasn't capturing item.description in PO loop. Fix: added if (item.description && !entry.description) entry.description = item.description in PO accumulation.

Q160: Biggest production limitation? Synchronous OCR: HTTP request blocks 2-8 seconds while Gemini processes. For any meaningful volume, needs async processing via message queue.

---

# SECTION 6 — MongoDB Deep Dive (75 Key Questions)

Q161: Indexes on your collections? PO: {poNumber:1} unique, {documentType:1}. GRN: {poNumber:1}, {grnNumber:1}. Invoice: {poNumber:1}, {invoiceNumber:1}. SKU: {skuCode:1} unique, {eanCode:1} partial unique.

Q162: Why partial unique index on eanCode? Multiple SKUs can have null EAN codes. Standard unique index treats all nulls as conflicting (E11000). partialFilterExpression: {eanCode: {$exists: true, $ne: null, $gt: ''}} enforces uniqueness only for actual EAN values.

Q163: BSON vs JSON? BSON is Binary JSON — MongoDB's binary serialization. Supports more types: ObjectId, Date, Binary, Decimal128, Int32, Int64.

Q164: 16MB document size limit? MongoDB BSON documents max 16MB. For large documents: GridFS for binary data, or split into child documents.

Q165: $unwind? Deconstructs array field into multiple documents, one per element. { $unwind: '$lineItems' } -> one document per line item.

Q166: $facet? Runs multiple aggregation pipelines on same input simultaneously. Useful for dashboard queries: counts, sums, distributions in single DB round trip.

Q167: $group? Groups by field, applies accumulators. { $group: { _id: '$poNumber', count: { $sum: 1 }, total: { $sum: '$amount' } } }

Q168: Optimal aggregation pipeline order? $match -> $sort -> $skip -> $limit -> $project -> $lookup -> $group. Match early to reduce document set.

Q169: Types of MongoDB indexes? Single field, Compound, Multikey (arrays), Text, Geo, Hashed (sharding), Sparse, Partial, TTL, Unique.

Q170: upsert? updateOne(filter, update, {upsert: true}) — creates document if no match. "Insert if not exists, update if exists."

Q171: $push vs $addToSet? $push appends (allows duplicates). $addToSet appends only if element doesn't already exist (set semantics).

Q172: Query nested fields? Dot notation: { 'lineItems.sku': 'SKU001' }. MongoDB matches documents where any array element satisfies condition.

Q173: $elemMatch? { lineItems: { $elemMatch: { sku: 'X', quantity: { $gt: 10 } } } } — ensures both conditions match the SAME array element, not across different elements.

Q174: What is a covered query? MongoDB answers entirely from the index without examining documents. Project only indexed fields — extremely fast.

Q175: Change streams? collection.watch() emits change events in real time on inserts/updates/deletes. Requires replica set. Alternative to polling for real-time sync.

Q176: Write concern? How many replica set members must acknowledge write before driver returns success. w:1 (primary only). w:"majority" (stronger durability, higher latency).

Q177: Read preference? Which replica set member reads go to. primary, primaryPreferred, secondary, secondaryPreferred, nearest. Secondary reads reduce primary load but may read stale data.

Q178: What causes slow MongoDB queries? Missing index (COLLSCAN vs IXSCAN). Large result sets without projection. Complex aggregations. Large $in arrays.

Q179: Avoid N+1 queries? Use $lookup or batch load with $in instead of fetching one document then querying for each related item.

Q180: WiredTiger storage engine? MongoDB's default since 3.2. Document-level concurrency, snappy compression, B-tree indexes.

Q181-Q235 (key points):
- Transactions: multi-document ACID via sessions (MongoDB 4.0+). session.withTransaction() rolls back all on failure.
- Sharding: horizontal partitioning on shard key across multiple instances. Complex to configure.
- $merge vs $out: $out replaces entire collection. $merge inserts/updates matching documents.
- $graphLookup: recursively searches collection. Useful for hierarchical data.
- Collation: language-specific string comparison rules.
- $bucket: groups documents into user-defined ranges — useful for histograms.
- Atlas Online Archive: moves infrequently accessed data to S3-compatible archive, still queryable.
- explain() verbosity: queryPlanner (winning plan), executionStats (actual stats), allPlansExecution (all candidate plans).
- Index intersection: MongoDB combining two indexes to satisfy a query rather than using one compound index.
- Hashed index: indexes hash of field value — for sharding to distribute data evenly. Not useful for range queries.
- $cond: conditional expression — if/then/else in aggregation.
- Sparse index: only indexes documents where field exists. Different from partial index (filter expression).

---

# SECTION 7-8 — REST & Security Key Concepts

## REST API Design

**Endpoints**: POST /api/v1/auth/login | POST /api/v1/documents/upload | GET /api/v1/documents | GET /api/v1/documents/:id | GET /api/v1/documents/:id/file | GET /api/v1/match/:poNumber | CRUD /api/v1/skus | GET /health

**Why /v1 versioning**: Breaking changes in v2 without breaking v1 clients. Prefix versioning most explicit.

**Pagination**: page and limit params. skip = (page-1) * limit. Return {data, meta: {page, limit, total, totalPages}}.

**Cursor-based vs offset-based pagination**: Offset: SKIP(n).LIMIT(m) — simple but unstable with new inserts. Cursor: use last item ID — stable for real-time data.

**Error format**: { success: false, errors: [{code, message}] } — consistent, machine-parseable, frontend-friendly.

## Security Essentials

**Helmet**: 11+ security headers. X-Frame-Options, X-Content-Type-Options, CSP, HSTS, removes X-Powered-By.

**Why disable X-Powered-By**: Reveals server technology (Express). Helps attackers target known vulnerabilities.

**JWT risks**: Token theft (no revocation), payload not encrypted, no server-side invalidation without blocklist.

**Input sanitization**: Remove/encode characters interpreted as code. Sanitize $ and . in MongoDB field names.

**Rate limiting**: express-rate-limit. 100 req/15min per IP. Redis store for distributed rate limit state.

**Timing attack**: Use crypto.timingSafeEqual() for constant-time token comparison.

**OWASP Top 10**: Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration, Vulnerable Components, Authentication Failures, Integrity Failures, Logging Failures, SSRF.

**Path traversal**: Generate server-controlled filenames — don't use req.file.originalname as stored filename.

**Account enumeration**: Always return same generic error "Invalid credentials" whether username missing or password wrong.

---

# SECTION 9-10 — Deployment & Assignment Deep Dive

## Key Deployment Facts

**Render ephemeral filesystem**: Containers rebuilt on deploy/restart, wiping local disk. MongoDB metadata persists; physical file gone. Production fix: S3 or GCS for file storage.

**Dockerfile example**:
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 5001
USER node
CMD ["node", "src/server.js"]

**Health checks**: GET /health -> {status: 'ok', uptime: N}. Load balancers use this for traffic routing decisions.

**PM2**: Production process manager. Cluster mode, auto-restart, log management, monitoring, zero-downtime deploys.

**Zero-downtime deploy**: Blue-green (switch traffic between environments), rolling (replace instances one by one), canary (route small % to new version first).

## Design Decision Justifications

**Feature-based architecture over layer-based?**
Layer-based causes high coupling — change to SKU feature touches 3+ directories. Feature-based groups all related code together. Co-location reduces cognitive load, supports team ownership. Tradeoff: potential code duplication if utilities aren't properly shared.

**Not NestJS?**
NestJS enforces DI containers, decorators, metadata reflection. For a solo project, I implemented my own clean architecture without fighting framework opinions. Tradeoff: less scaffolding but more control.

**MongoDB over PostgreSQL?**
AP document schemas vary significantly between vendors. Variable line item counts. MongoDB embedded arrays handle this without schema migrations. If data were highly relational with strict consistency requirements -> PostgreSQL.

**Not RabbitMQ/Kafka?**
For assignment MVP scope, synchronous processing is simpler to debug and demonstrate. A message queue would require queue infrastructure, worker processes, dead letter queues, monitoring — significant overhead for an MVP.

**Synchronous parsing?**
Tradeoff: simplicity vs scalability. Synchronous: simpler, immediate result. Async: better UX, better scalability. For the assignment, synchronous demonstrates the pipeline clearly. Production: definitely async with job queue.

**Biggest weaknesses**:
1. Synchronous OCR blocks event loop for 2-8s
2. Local file storage lost on Render restart
3. No retry mechanism for failed OCR
4. No background job system
5. Static Bearer token instead of proper RBAC

**Would do differently (2 more weeks)**:
1. Async processing with BullMQ
2. S3 for file storage
3. 90%+ test coverage with Jest
4. Proper JWT with refresh tokens + RBAC
5. Webhook for ERP integration

---

# SECTION 11 — Production Scenarios (50 Key Scenarios)

**OCR down?** Return 503 with {code: 'OCR_SERVICE_UNAVAILABLE'}. Enqueue for retry. Alert on-call. Consider backup provider (AWS Textract).

**MongoDB unavailable?** Mongoose fires disconnected event. Queries reject. Error handler returns 503. Mongoose auto-reconnects. Implement circuit breaker.

**Same invoice uploaded twice?** Currently creates two records. DUPLICATE_INVOICE rule catches during matching. Better: check invoiceNumber uniqueness before creating, return 409 Conflict.

**Corrupted PDF?** Multer saves. Gemini returns error or invalid JSON. Validation catches schema mismatch, returns 400 DOCUMENT_VALIDATION_ERROR.

**Memory spikes to 95%?** Identify with process.memoryUsage() or heap snapshot. Common culprit: large file in memory. Fix: stream large files, implement memory limits.

**Inconsistent vendor SKU codes?** SKU Resolver tries multiple lookups. If none match, MISSING_SKU fires. Long-term: alias table in SKU Master for vendor code mapping.

**API key committed to GitHub?** IMMEDIATE: rotate key in Google AI Studio. Remove from git history with git filter-repo. Force-push. Audit usage logs. Add pre-commit hook (git-secrets).

**Incorrect match results for specific PO?** Check raw MongoDB documents. Add debug logging to each rule evaluation. Run engine in isolation with problematic documents. Check SKU Resolver and aggregator output.

**Zero unit price in invoice?** PRICE_MISMATCH fires (100% delta). Validate minimum price thresholds. Zero-price invoices flagged as potentially fraudulent.

**Thousands of concurrent parse requests?** Gemini rate limits hit (429). Implement request queue with semaphore for concurrent processing limit. Exponential backoff retry.

**PO cancelled after GRN received?** Currently: no PO status field. Improvement: status: 'CANCELLED' in PO. Matching engine checks status -> HOLD all invoices.

**Disk space exhausts on Render?** Uploaded files fill ephemeral disk. New uploads fail. Solution: S3 for file storage (no local disk), log rotation.

**Attacker sends executable with .pdf extension?** MIME type filter checks file.mimetype from busboy (actual MIME from magic bytes). Also validate with file-type library for additional assurance.

**GRN PDF preview fails after Render restart?** Root cause: Render ephemeral disk wiped on restart. MongoDB metadata persists, physical file gone. Short-term: diagnostic logging. Long-term: S3.

**Frontend shows stale match results after re-upload?** TanStack Query caches. After successful upload, call queryClient.invalidateQueries(['match', poNumber]) to force refetch.

**Price in Indian format (1,50,000)?** parseFloat(value.replace(/,/g, '')). Without this, 1,50,000 becomes 1 — catastrophic financial error.

**Description shows SKU code instead of product name?** Root cause: LineItemAggregator wasn't capturing item.description in PO loop. Fix: if (item.description && !entry.description) entry.description = item.description.

**High CPU usage?** node --prof flame graph. Look for synchronous operations (crypto, large JSON.stringify). Check if event loop blocked with clinic.js.

**Match triggered before documents uploaded?** Engine matches with available documents. Improvement: readyForMatch status requiring all three document types present.

**Server crashes on specific PDF?** PDF causes unhandled exception in Gemini parsing. Add try-catch around parse call. Log document ID. Add process.on('uncaughtException') as safety net.

---

# SECTION 12 — Behavioural Questions (40)

**Tell me about yourself.** "Backend-focused engineer with strong foundation in Node.js, Express, MongoDB. Built this Three-Way Match Engine — genuinely interesting because it sits at the intersection of systems design, financial domain modeling, and practical data engineering. Drawn to Finifi because AP automation is genuinely unsolved for most mid-market businesses."

**Hardest bug?** "Multer relative path regression. Files uploaded from main server worked fine. But files uploaded via certain configurations disappeared — MongoDB had metadata, directory existed, files weren't there. Root cause: relative paths resolve differently based on Node.js process working directory at invocation time. Fix: path.resolve() — one line — but diagnosing required systematic elimination."

**Most proud design decision?** "Strategy pattern for document parsing. DocumentService._parse() selects parser based on config. I could develop and test the entire pipeline without a Gemini API key. Switching to production parsing required zero code changes — just setting an environment variable."

**Would do differently?** "Async document processing from day one. Upload blocks 2-8 seconds waiting for Gemini. Production AP system processing 500 invoices simultaneously would be catastrophic. I'd implement BullMQ — upload returns job ID immediately, parsing in background."

**How do you handle ambiguous requirements?** "Make assumptions explicit and document them. I implemented a static configurable token from environment variables, documented the assumption, and also documented what a production JWT implementation would look like."

**How do you handle production incidents?** "Triage: severity assessment. Mitigation: restore service first (rollback, restart, feature flag). Investigation: RCA with logs. Fix: targeted minimal change. Prevention: add scenario to test suite. Post-mortem: written RCA with action items."

**What's a tradeoff you made?** "MongoDB over PostgreSQL. Right call at this scale — flexible schema, good aggregation. If system evolved to need complex relational queries across entities, PostgreSQL's query planner would be better. Same decision at this scale; different at 10x."

**Questions to ask interviewer:**
1. "What does a typical day look like for a backend engineer on the AP matching team?"
2. "What's the biggest technical challenge the engineering team is facing right now?"
3. "How does the team balance new feature development vs infrastructure and reliability work?"
4. "What does the OCR pipeline look like in production — Gemini, Textract, or something else?"

---

# SECTION 13 — Mock Interview

## Round 1: Project Introduction
**Q**: "Walk me through your project at a high level."
**Answer**: "The Three-Way Match Engine automates a critical accounts payable verification process. Before a company pays a supplier invoice, they need to verify it matches what was ordered (Purchase Order) and what was actually received (Goods Received Note). My system accepts PDF uploads for all three, uses OCR to extract structured data, runs a rule engine checking seven financial and quantity rules, and outputs an AP recommendation — Approve, Flag for Review, or Hold. Tech stack: Node.js, Express, MongoDB, Google Gemini for OCR, deployed on Render."
**Key**: Lead with business problem. Use financial language.

## Round 2: Technical Depth
**Q**: "How does document parsing work?"
**Answer**: "Multer saves the PDF to disk. DocumentService calls the parser — Strategy pattern, parser selection is configurable. In production: Gemini parser reads PDF as binary, base64-encodes it, sends to Gemini 1.5 Flash API with structured prompt asking for specific fields — document number, vendor, date, line items with SKU/quantity/price. API returns JSON, we validate against schema, map to domain models, persist to MongoDB. In development: Mock parser returns deterministic fixture data, no API call."
**Key**: Mention Strategy pattern. Mention dev vs prod distinction.

## Round 3: Problem Solving
**Q**: "Files disappear after Render restarts. How would you fix this properly?"
**Answer**: "Render ephemeral filesystem limitation — containers rebuilt on deploy/restart, wiping local disk. Permanent solution: replace local disk storage with cloud object storage. Specifically — use multer-s3 adapter instead of diskStorage. File stream goes directly to S3 bucket. MongoDB stores S3 URL instead of local file path. File streaming endpoint uses signed S3 URL or proxies stream from S3. File storage becomes durable and independent of container lifecycle."
**Key**: Explain how — the Multer adapter, what changes in MongoDB, how streaming changes.

## Round 4: Challenge Your Design
**Q**: "Why store file paths in MongoDB instead of the files themselves (GridFS)?"
**Answer**: "Tradeoff. GridFS would solve Render ephemeral problem — files in MongoDB Atlas, durable across restarts. Advantages of my approach: simpler file streaming (res.sendFile), faster queries (no binary data in documents), faster local disk I/O vs DB round trip. GridFS advantages: single storage system, no S3 billing. For the assignment, local path was right for simplicity. For production on Render: S3 is the correct answer — and I documented this limitation explicitly in the README."
**Key**: Acknowledge the limitation honestly. Know the alternatives.

## Round 5: System Design
**Q**: "How would you handle 1 million invoices per month?"
**Answer**: "Synchronous approach breaks at that scale. Redesign: (1) Upload endpoint saves PDF to S3, returns jobId immediately. (2) S3 triggers SQS message. (3) Pool of workers (Lambda or ECS) consume from SQS, call Gemini with retry logic, parse, validate, store. (4) Workers emit SNS events when done. (5) Client polls status or receives webhooks. Matching engine: already stateless, can run horizontally. MongoDB: Atlas auto-scaling, proper indexes, read replicas. At 1M/month that's 33,000/day. 5 concurrent workers at 1 invoice/5s = 86,400/day — sufficient with headroom."
**Key**: Give concrete numbers. Show you understand bottlenecks at each layer.

## Round 6: Debugging
**Q**: "Match result shows wrong product name — SKU code instead of product name."
**Answer**: "Trace data flow from MongoDB to API response. First, check MongoDB document — does PO line item have a description field? If not, OCR parser didn't extract it. Second, check LineItemAggregator — is entry.description being set when processing PO line items? I actually fixed exactly this bug — the aggregator was correctly setting description from GRN items but not from PO items. Fix: added 'if (item.description && !entry.description) entry.description = item.description' in the PO accumulation loop. Third, check ResultBuilder — does it fall back to SKU Master name if description is empty? I'd add temporary logging at each step, reproduce with specific PO number, verify each layer."
**Key**: Reference the actual bug you fixed — shows deep system knowledge.

---

# SECTION 14 — Cheat Sheet (5 Pages)

## Page 1: Project Summary

```
THREE-WAY MATCH ENGINE — QUICK REFERENCE

Domain: Accounts Payable Automation
Purpose: Verify PO + GRN + Invoice before payment release

TECH STACK:
  Backend:  Node.js + Express.js + MongoDB + Multer
  Frontend: Next.js + TypeScript + TanStack Query
  Parsing:  Google Gemini 1.5 Flash (base64 PDF -> structured JSON)
  Deploy:   Render

KEY PATTERNS:
  Strategy   -> Document parser (Gemini vs Mock)
  Repository -> DB access layer (no business logic)
  Service    -> Business logic (no HTTP concern)
  Controller -> HTTP (no business logic)

FOLDER STRUCTURE:
  src/
  |-- app.js              <- Express setup + middleware
  |-- config/env.js       <- Config validation
  |-- shared/logger.js    <- Winston logger
  |-- shared/uomNormalizer.js  <- OCR artifact normalization
  |-- domain/             <- Rich domain objects
  +-- modules/
      |-- auth/           <- Login + Bearer token
      |-- document/       <- Upload, parse, stream
      |-- matching/       <- Aggregator, RuleEngine, ResultBuilder
      +-- sku/            <- SKU Master CRUD
```

## Page 2: Matching Engine Logic

```
MATCHING ENGINE FLOW:
  GET /api/v1/match/:poNumber
  -> Fetch PO + GRNs[] + Invoices[] from MongoDB
  -> SKUResolver.resolve() -> canonical SKU per line item
  -> LineItemAggregator -> merge by canonical SKU
  -> RuleEngine.evaluate() -> 7 rules
  -> ResultBuilder.build() -> AP recommendation

7 RULES:
  Rule                      Severity  Trigger
  DUPLICATE_INVOICE         FAIL      invoiceNumber appears >1x
  DUPLICATE_GRN             FAIL      grnNumber appears >1x
  PO_GRN_QUANTITY_MISMATCH  WARN      received < ordered
  INVOICE_GRN_MISMATCH      WARN      invoiced != received
  PRICE_MISMATCH            FAIL      delta price > tolerance%
  MISSING_SKU               FAIL      SKU not in master
  INACTIVE_SKU              FAIL      SKU.isActive === false
  INVENTORY_REJECTION       WARN      rejectedQty > 0

FINANCIAL EXPOSURE = (invoicedQty - receivedQty) x invoicePrice

AP RECOMMENDATION:
  All PASS   -> APPROVE
  Any WARN   -> FLAG FOR REVIEW
  Any FAIL   -> HOLD
```

## Page 3: API Contract

```
ENDPOINTS:
  POST   /api/v1/auth/login         -> { token }
  POST   /api/v1/documents/upload   -> 201 { _id, ... }
  GET    /api/v1/documents          -> 200 [...]
  GET    /api/v1/documents/:id      -> 200 { document }
  GET    /api/v1/documents/:id/file -> 200 PDF stream
  GET    /api/v1/match/:poNumber    -> 200 match result
  CRUD   /api/v1/skus
  GET    /health                    -> { status: 'ok', uptime }

RESPONSE FORMAT:
  Success: { success: true, data: { ... } }
  Error:   { success: false, errors: [{ code, message }] }

HTTP STATUS CODES:
  200 OK | 201 Created | 400 Bad Request | 401 Unauthorized
  404 Not Found | 409 Conflict | 415 Unsupported Media | 500 Error

COMMON ERROR CODES:
  VALIDATION_ERROR | DOCUMENT_NOT_FOUND | FILE_NOT_FOUND
  DUPLICATE_INVOICE | INVALID_CREDENTIALS | MISSING_SKU
  FILE_UPLOAD_FAILED | DOCUMENT_VALIDATION_ERROR
```

## Page 4: Key Concepts

```
EVENT LOOP ORDER:
  Call Stack -> Microtasks (Promise.then, nextTick) -> Macrotasks (setTimeout, I/O)

ASYNC/AWAIT:
  async fn -> returns Promise
  await -> suspends fn, yields to event loop, resumes when resolved
  "No thread creation -- event loop handles it"

STREAM VS BUFFER:
  Buffer: load entire file into memory (bad for large PDFs)
  Stream: process chunks -- res.sendFile() uses stream internally

MONGOOSE:
  Schema    -> structure + validation
  Model     -> compiled from Schema, used for queries
  lean()    -> plain JS, 2-3x faster, no Mongoose methods
  populate()-> resolve ObjectId (prefer $lookup at scale)

MONGODB INDEXES:
  Single:         { poNumber: 1 }
  Compound:       { poNumber: 1, documentType: 1 }
  Unique:         { skuCode: 1 }, unique: true
  Partial unique: { eanCode: 1 }, partialFilterExpression:
                  { eanCode: { $exists: true, $ne: null, $gt: '' } }
  TTL:            { createdAt: 1 }, expireAfterSeconds: 86400

AGGREGATION ORDER (optimal):
  $match -> $sort -> $skip -> $limit -> $project -> $lookup -> $group
```

## Page 5: Critical Talking Points

```
WHY MONGODB OVER POSTGRESQL?
  -> Variable document schemas (PO line items: 2 to 500)
  -> Flexible embedded arrays for line items
  -> No schema migrations for new vendor fields
  -> If data were highly relational -> PostgreSQL

WHY TANSTACK QUERY OVER REDUX?
  -> 95% of state is server state
  -> Automatic caching, refetching, loading/error states
  -> Redux adds boilerplate with no benefit here

WHAT I'D DO DIFFERENTLY:
  1. Async OCR with BullMQ (non-blocking upload)
  2. S3 for file storage (survives Render restarts)
  3. JWT with refresh tokens + RBAC
  4. 90%+ test coverage

HARDEST BUG -> Multer relative path regression:
  Problem: ./uploads resolved differently based on process CWD
  Fix: path.resolve() in destination callback

PARTIAL UNIQUE INDEX -> Fix for E11000 on null EANs:
  partialFilterExpression: { eanCode: { $exists: true, $ne: null, $gt: '' } }

DESCRIPTION BUG -> LineItemAggregator fix:
  Added: if (item.description && !entry.description) entry.description = item.description
  in the PO accumulation loop (was missing -- only existed for GRN)

SCALE TO 1M INVOICES/MONTH:
  Upload -> S3 -> SQS -> Workers (Gemini + parse) -> MongoDB
  Cache repeated documents by content hash
  At 33,000/day: 5 workers at 1/5sec = 86,400/day capacity

PRODUCTION GAPS (be honest about):
  - No persistent file storage (ephemeral Render disk)
  - Synchronous OCR blocks event loop
  - No real RBAC (static Bearer token)
  - Limited test coverage
  - No message queue for async processing

RECA API AUTH FLOW:
  1. POST /auth/login {username, password}
  2. Backend compares against env.AUTH_USERNAME, env.AUTH_PASSWORD
  3. Returns { token: env.JWT_SECRET } (static Bearer token)
  4. All other endpoints check: Authorization: Bearer {token}
```

---

# SECTION 15 — Last 30 Minutes Before Interview

## Checklist
- [ ] Read Page 5 of Cheat Sheet (Section 14)
- [ ] Recall all 7 matching rules and their triggers
- [ ] Practice 3-sentence project summary (5-minute pitch)
- [ ] Remember the Multer path bug story
- [ ] Remember the LineItemAggregator description bug
- [ ] Review 3-4 questions to ask the interviewer
- [ ] Check audio/video if video call
- [ ] Close distracting apps, silence phone

## What to Revise (Priority Order)
1. Project walkthrough — 5 and 10 minute versions
2. Matching engine — 7 rules, SKU resolver, aggregator
3. Architecture — describe from memory
4. Top 3 design decisions — MongoDB vs SQL, feature architecture, Strategy pattern
5. Top 3 things you'd change — async OCR, S3, RBAC

## What NOT to Study in the Last 30 Minutes
- Don't try to learn new concepts
- Don't memorize exact code syntax
- Don't re-read all sections
- Don't second-guess your design decisions
- Don't read about Finifi's competitors

## Common Mistakes to Avoid

| Mistake | Better Approach |
|---|---|
| "I don't know" and stopping | "I'm not certain, but my understanding is..." |
| Defensive about design decisions | "It was a tradeoff. At scale, I'd do X instead." |
| Over-explaining simple answers | Lead with the answer, expand only if asked |
| Forgetting business impact | Always connect technical decisions to outcomes |
| Silence on hard questions | Think aloud: "Let me think through this..." |
| Claiming perfection | Proactively mention limitations and improvements |

## Opening Line
"I'm excited to discuss this — I found the AP automation domain genuinely interesting while building it. Happy to walk through any part of the implementation in whatever depth is useful."

## Closing Line
"I enjoyed this discussion. Is there anything about the implementation I didn't explain clearly that you'd like me to expand on?"

---

**Final Note**: The interviewer has already read your code and liked it enough to invite you for discussion. This is a conversation about a system you both understand. Lead with confidence. You know this code better than anyone in the room — you built it.

---

*Finifi Technical Interview Preparation | Three-Way Match Engine | 2026-08-05*

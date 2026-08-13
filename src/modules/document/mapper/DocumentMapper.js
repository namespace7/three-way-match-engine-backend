'use strict';

const PurchaseOrder = require('../../../domain/PurchaseOrder');
const GRN = require('../../../domain/GRN');
const Invoice = require('../../../domain/Invoice');

/**
 * @class DocumentMapper
 *
 * Transforms raw parsed document data (output of a DocumentParser) into
 * canonical domain objects.
 *
 * Gemini AI returns snake_case keys in a nested structure. This mapper
 * translates them into the camelCase flat structure expected by the domain
 * constructors.
 *
 * Actual Gemini PO shape:
 *   {
 *     purchase_order:  { po_no, po_date, payment_terms, ... },
 *     vendor_details:  { name, address, gstin, pan, contact },
 *     billing_address: { company_name, address, gstin, email, contact },
 *     line_items:      [{ s_no, item_code, item_description, qty,
 *                          unit_base_cost_inr, total_inr, ... }],
 *     summary_totals:  { grand_total_inr, total_tax_inr, ... }
 *   }
 */
class DocumentMapper {
  // ─── Purchase Order ────────────────────────────────────────────────────────

  /**
   * Maps raw parsed data into a canonical PurchaseOrder domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {PurchaseOrder} Canonical PurchaseOrder domain object.
   */
  mapPurchaseOrder(rawData) {
    // Gemini & Mock output variants across calls and parsers
    const po      = rawData.purchase_order_details || rawData.purchase_order || rawData.purchaseOrder || rawData || {};
    const vendor  = rawData.vendor_details         || rawData.supplier_details || po.supplier || rawData.supplier || {};
    const billing = rawData.billing_address        || rawData.buyer_details    || po.buyer    || rawData.buyer    || {};
    const items   = rawData.line_items             || rawData.lineItems        || po.line_items || po.lineItems || [];
    const totals  = rawData.summary_totals         || rawData.summary          || po.summary    || {};

    return new PurchaseOrder({
      poNumber:     po.po_no         || po.po_number    || po.poNumber,
      issueDate:    po.po_date       || po.issue_date   || po.issueDate   || null,
      currency:     po.currency      || 'INR',
      paymentTerms: po.payment_terms || po.paymentTerms || null,

      supplier: {
        name:    vendor.vendor_name || vendor.name    || '',
        address: vendor.address     || '',
        gstin:   vendor.gstin       || vendor.taxId   || '',
        taxId:   vendor.gstin       || vendor.taxId   || '',
        pan:     vendor.pan         || '',
        contact: vendor.contact     || '',
      },

      buyer: {
        name:    billing.company_name || billing.name || billing.buyer_name || billing.company || '',
        address: billing.address      || '',
        gstin:   billing.gstin        || billing.taxId || '',
        taxId:   billing.gstin        || billing.taxId || '',
        email:   billing.email        || '',
        contact: billing.contact      || '',
      },

      lineItems: items.map((item, index) => ({
        lineNumber:  item.s_no        || item.lineNumber  || index + 1,
        sku:         String(item.item_code || item.sku || ''),
        // Gemini alternates between 'item_desc' and 'item_description'
        description: item.item_description || item.item_desc || item.description || '',
        quantity:    Number(item.qty       || item.quantity    || 0),
        unitPrice:   Number(item.unit_base_cost_inr || item.unitPrice || 0),
        totalPrice:  Number(item.total_inr           || item.totalPrice || 0),
      })),

      totalAmount: Number(totals.grand_total_inr || totals.total_amount_inr || totals.totalAmount || 0),
    });
  }

  // ─── GRN ──────────────────────────────────────────────────────────────────

  /**
   * Maps raw parsed data into a canonical GoodsReceivedNote (GRN) domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {GRN} Canonical GRN domain object.
   */
  mapGRN(rawData) {
    const grn   = rawData.grn || rawData.goods_received_note || rawData;
    const items = rawData.line_items || rawData.lineItems || grn.line_items || grn.lineItems || [];

    return new GRN({
      grnNumber:    grn.grn_number   || grn.grnNumber,
      poReference:  grn.po_reference || grn.poReference || grn.po_no,
      receivedDate: grn.received_date || grn.receivedDate || null,
      warehouse:    grn.warehouse    || '',
      receivedBy:   grn.received_by  || grn.receivedBy   || '',

      lineItems: items.map((item, index) => ({
        lineNumber:       item.s_no              || item.lineNumber       || index + 1,
        sku:              String(item.item_code  || item.sku || ''),
        orderedQuantity:  Number(item.ordered_quantity  || item.orderedQuantity  || item.qty || 0),
        receivedQuantity: Number(item.received_quantity || item.receivedQuantity || item.qty || 0),
        rejectedQuantity: Number(item.rejected_quantity || item.rejectedQuantity || 0),
        rejectionReason:  item.rejection_reason  || item.rejectionReason  || null,
      })),
    });
  }

  // ─── Invoice ───────────────────────────────────────────────────────────────

  /**
   * Maps raw parsed data into a canonical Invoice domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {Invoice} Canonical Invoice domain object.
   */
  mapInvoice(rawData) {
    const inv    = rawData.invoice || rawData.tax_invoice || rawData.invoice_details || rawData;
    const vendor = rawData.vendor_details || rawData.supplier_details || inv.supplier || rawData.supplier || {};
    const items  = rawData.line_items || rawData.lineItems || inv.line_items || inv.lineItems || [];
    const totals = rawData.summary_totals || rawData.totals || inv.summary || {};

    return new Invoice({
      invoiceNumber: inv.invoice_number || inv.invoiceNumber,
      poReference:   inv.po_number      || inv.po_reference   || inv.poReference,
      grnReference:  inv.grn_number     || inv.grn_reference  || inv.grnReference  || null,
      issueDate:     inv.invoice_date   || inv.issue_date      || inv.issueDate     || null,
      dueDate:       inv.due_date       || inv.dueDate         || null,
      currency:      inv.currency       || 'INR',

      supplier: {
        name:    vendor.vendor_name || vendor.name    || inv.supplier_name  || '',
        address: vendor.address     || '',
        gstin:   vendor.gstin       || inv.supplier_gstin || vendor.taxId || '',
        taxId:   vendor.gstin       || inv.supplier_gstin || vendor.taxId || '',
        contact: vendor.contact     || '',
      },

      lineItems: items.map((item, index) => ({
        lineNumber:  item.s_no              || item.lineNumber  || index + 1,
        sku:         String(item.item_code  || item.sku || ''),
        description: item.item_description || item.description || '',
        quantity:    Number(item.qty        || item.quantity    || 0),
        unitPrice:   Number(item.unit_base_cost_inr || item.rate || item.unitPrice || 0),
        totalPrice:  Number(item.total_inr           || item.amount || item.totalPrice || 0),
      })),

      subtotal:    Number(totals.total_amount_inr || totals.subtotal    || 0),
      taxAmount:   Number(totals.total_tax_inr    || totals.taxAmount   || 0),
      totalAmount: Number(totals.grand_total_inr  || totals.totalAmount || 0),
    });
  }
}

module.exports = DocumentMapper;

/** A customer is opened in its own list by its code: names are not unique and can change, ids do not belong in an address. */
export const customerHref = (code: string) => `/workspace/customers?code=${encodeURIComponent(code)}`;
/** A sales invoice is opened in the invoice list by its code. */
export const invoiceHref = (code: string) => `/operations/sales-invoice-list?code=${encodeURIComponent(code)}`;

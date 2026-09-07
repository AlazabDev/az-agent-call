export interface DaftraClientRecord {
	id: number;
	client_number?: string;
	first_name?: string;
	last_name?: string;
	business_name?: string;
	email?: string;
	phone1?: string;
	phone2?: string;
	address1?: string;
	city?: string;
	country_code?: string;
	notes?: string;
	balance?: number;
	paid?: number;
	unpaid?: number;
	status?: string;
}

export interface DaftraProductRecord {
	id: number;
	product_code?: string;
	name: string;
	unit_price?: number;
	purchase_price?: number;
	quantity?: number;
	description?: string;
	category_id?: number;
	category_name?: string;
}

export interface DaftraInvoiceItem {
	item_id?: number;
	product_id?: number;
	name?: string;
	unit_price: number;
	quantity: number;
	tax1?: number;
	discount?: number;
}

export interface DaftraInvoiceRecord {
	id: number;
	invoice_number?: string;
	no?: string;
	client_id: number;
	client_name?: string;
	issue_date?: string;
	due_date?: string;
	summary?: string;
	subtotal?: number;
	tax?: number;
	total: number;
	paid?: number;
	balance?: number;
	status?: "draft" | "sent" | "paid" | "partial" | "overdue" | string;
	items?: DaftraInvoiceItem[];
	work_order_id?: number;
}

export interface DaftraPaymentRecord {
	id: number;
	invoice_id: number;
	amount: number;
	payment_method?: string;
	transaction_number?: string;
	date?: string;
	notes?: string;
}

export interface DaftraSupplierRecord {
	id: number;
	supplier_number?: string;
	first_name?: string;
	last_name?: string;
	business_name?: string;
	email?: string;
	phone1?: string;
}

export interface DaftraPurchaseOrderRecord {
	id: number;
	order_number?: string;
	supplier_id: number;
	total: number;
	status?: string;
	issue_date?: string;
	items?: DaftraInvoiceItem[];
}

export interface DaftraPurchaseInvoiceRecord {
	id: number;
	invoice_number?: string;
	supplier_id: number;
	supplier_name?: string;
	total: number;
	paid?: number;
	balance?: number;
	status?: string;
	date?: string;
	work_order_id?: number;
	items?: DaftraInvoiceItem[];
}

export interface DaftraExpenseRecord {
	id: number;
	title: string;
	amount: number;
	category_id?: number;
	payment_method?: string;
	date?: string;
	notes?: string;
}

export interface DaftraIncomeRecord {
	id: number;
	title: string;
	amount: number;
	date?: string;
	notes?: string;
}

export interface DaftraWorkOrderRecord {
	id: number;
	order_no?: string;
	title?: string;
	name?: string;
	client_id?: number;
	status?: string;
	start_date?: string;
	end_date?: string;
}

export interface CustomerCallerContext {
	client?: DaftraClientRecord;
	openInvoices: DaftraInvoiceRecord[];
	recentInvoices: DaftraInvoiceRecord[];
	workOrders: DaftraWorkOrderRecord[];
	balance: {
		totalBilled: number;
		paid: number;
		unpaid: number;
		overdue: number;
	};
	matchedBy: "phone" | "email" | "id" | "none";
}

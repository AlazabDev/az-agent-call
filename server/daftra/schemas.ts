import * as z from "zod";

export const daftraClientSearchSchema = z.object({
	query: z
		.string()
		.optional()
		.describe("Search term, name, email, or client ID"),
	phone: z.string().optional().describe("Phone number of client"),
	limit: z.number().optional().default(50),
});

export const daftraCreateClientSchema = z.object({
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	business_name: z.string().optional(),
	email: z.string().email().optional(),
	phone1: z.string().optional(),
	address1: z.string().optional(),
	city: z.string().optional(),
	notes: z.string().optional(),
});

export const daftraCreateInvoiceSchema = z.object({
	client_id: z.number().describe("Daftra Client ID"),
	items: z
		.array(
			z.object({
				product_id: z.number().optional(),
				name: z.string().optional(),
				unit_price: z.number().positive(),
				quantity: z.number().positive().default(1),
			}),
		)
		.min(1)
		.describe("Invoice line items"),
	issue_date: z.string().optional(),
	due_date: z.string().optional(),
	notes: z.string().optional(),
	work_order_id: z.number().optional(),
	draft: z.boolean().optional().default(false),
});

export const daftraRecordPaymentSchema = z.object({
	invoice_id: z.number().describe("Daftra Invoice ID"),
	amount: z.number().positive().describe("Payment amount"),
	payment_method: z.string().optional().default("bank_transfer"),
	transaction_number: z.string().optional(),
	notes: z.string().optional(),
});

export const daftraCreatePurchaseOrderSchema = z.object({
	supplier_id: z.number().describe("Daftra Supplier ID"),
	items: z
		.array(
			z.object({
				product_id: z.number().optional(),
				name: z.string().optional(),
				unit_price: z.number().positive(),
				quantity: z.number().positive().default(1),
			}),
		)
		.min(1),
	notes: z.string().optional(),
});

export const daftraCreateExpenseSchema = z.object({
	title: z.string().min(1).describe("Expense title"),
	amount: z.number().positive().describe("Expense amount"),
	category_id: z.number().optional(),
	payment_method: z.string().optional().default("cash"),
	notes: z.string().optional(),
});

export const daftraSearchEntitiesSchema = z.object({
	query: z
		.string()
		.min(1)
		.describe(
			"Name, SKU, phone, or keyword to search e.g. 'عوف', 'اربيسك', 'رخام'",
		),
	entity_type: z
		.enum([
			"all",
			"client",
			"supplier",
			"work_order",
			"product",
			"cost_center",
			"treasury",
		])
		.optional()
		.default("all"),
});

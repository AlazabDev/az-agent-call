import * as clients from "./modules/clients.js";
import * as products from "./modules/products.js";
import * as invoices from "./modules/invoices.js";
import * as payments from "./modules/payments.js";
import * as suppliers from "./modules/suppliers.js";
import * as purchases from "./modules/purchases.js";
import * as expenses from "./modules/expenses.js";
import * as incomes from "./modules/incomes.js";
import * as workOrders from "./modules/work-orders.js";
import { smartResolver } from "./resolver.js";
import { checkDaftraHealth } from "./health.js";

export const daftraService = {
  clients,
  products,
  invoices,
  payments,
  suppliers,
  purchases,
  expenses,
  incomes,
  workOrders,
  resolver: smartResolver,
  checkHealth: checkDaftraHealth,
};

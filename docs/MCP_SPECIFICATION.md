# Alazab Central Model Context Protocol (MCP) Specification
**Version:** 1.0.0  
**Status:** Active Production Standard  
**Domain:** Alazab Ecosystem Integration & Agent Communication Protocol  

---

## 1. Overview & Architectural Goals

The **Alazab Central MCP Protocol** defines the unified, standard interface for all AI Agents operating within the Alazab AI Infrastructure. It governs how AI agents interact with core operational systems, including telephony contact centers (`az-agent-call`), accounting & ERP software (**Daftra / دفتره المحاسبي**), CRM, storage, and workflow engines.

### Key Goals
- **Unified Agent Surface**: AI agents consume a single, consistent protocol specification regardless of underlying service boundaries.
- **Server-Locked Security**: Authentication and identity assertions are immutably resolved on the server via bearer tokens. Tools cannot forge or alter the authenticated entity.
- **Modular Connector Architecture**: New business applications (e.g. Daftra Accounting, payment gateways, custom CRMs) are registered as plug-and-play MCP connectors without modifying core protocol code.
- **Auditability & Observability**: Every tool execution is captured with structural metadata in central Supabase audit logs (`mail_send_log` / `call_audit_log` / `mcp_activity_log`).

---

## 2. Core Protocol Invariants & Envelope

### 2.1 Security & Authentication
- **Transport**: HTTPS Streamable Server Transport or standard SSE/JSON-RPC 2.0.
- **Authorization**: Mandatory HTTP Header: `Authorization: Bearer <AGENT_TOKEN>`.
- **Identity Locking**: The agent identity (`agent_id`, `foundry_id`, `caller_id/extension`, `company_scope`) is derived server-side from the bearer token. Input schemas **MUST NOT** include `From` or `TenantId` override fields.

### 2.2 Standard Tool Response Envelope
All tools registered under Alazab MCP return a standardized JSON string payload wrapped inside the MCP content text block:

```json
{
  "ok": true,
  "domain": "telephony | accounting | templates | system",
  "action": "action_name",
  "data": { ... },
  "error": null,
  "meta": {
    "agentId": "az-agent-azabot",
    "timestamp": "2026-08-31T08:30:00.000Z",
    "requestId": "req_8f9a2b1c"
  }
}
```

### 2.3 Error Handling
When a tool execution encounters an exception, it returns an error envelope with `"ok": false` and structured error codes:

```json
{
  "ok": false,
  "code": "DAFTRA_CLIENT_NOT_FOUND | CALL_FAILED | INVALID_INPUT",
  "error": "Human-readable description of the error.",
  "meta": {
    "agentId": "az-agent-azabot",
    "timestamp": "2026-08-31T08:30:00.000Z"
  }
}
```

---

## 3. Tool Domain Namespaces

Tools under Alazab Central MCP are organized into clear domain namespaces:

| Domain | Namespace / Prefix | Description |
| :--- | :--- | :--- |
| **System & Status** | `system_*` / `whoami` | Agent verification, readiness checks, connection health. |
| **Telephony & Contact Center** | `call_*` / `telephony_*` | Voice calls, softphone dispatch, audio transcripts, call logs. |
| **Voice Scripts & Prompts** | `template_*` | 144 shared voice prompts, IVR speech scripts, message rendering. |
| **Daftra Accounting** | `daftra_*` | Daftra ERP integration: Clients, Invoices, Payments, Products. |

---

## 4. Daftra Accounting Connector Specification (دفتره المحاسبي)

The **Daftra Accounting Connector** enables AI Call Center agents to interact directly with Daftra ERP during or after customer calls (e.g. looking up caller billing history, generating invoices for services agreed upon during calls, checking product stock, or recording payments).

### 4.1 Environment & Credentials Configuration
To connect to Daftra, the gateway relies on environment variables:
- `DAFTRA_SUBDOMAIN`: Subdomain of the Daftra account (e.g., `alazab`).
- `DAFTRA_API_KEY`: Secret API key provided by Daftra.
- `DAFTRA_BASE_URL`: Defaults to `https://{DAFTRA_SUBDOMAIN}.daftra.com/api2`.

---

### 4.2 Daftra MCP Tool Definitions

#### 1. `daftra_get_client`
*Description*: Searches and retrieves a client profile from Daftra by phone number, email, client ID, or name.
- **Input Schema**:
  - `phone` *(string, optional)*: Phone number or mobile (e.g. `+966500000000`).
  - `email` *(string, optional)*: Client email address.
  - `client_id` *(string, optional)*: Specific Daftra Client ID.
  - `search` *(string, optional)*: Free-text search term.

- **Sample Response**:
  ```json
  {
    "ok": true,
    "domain": "accounting",
    "action": "daftra_get_client",
    "data": {
      "found": true,
      "client": {
        "id": "1042",
        "name": "شركة الأمل للتجارة",
        "phone": "+966500000000",
        "email": "info@alamal.com",
        "balance": 1500.00,
        "currency": "SAR",
        "city": "الرياض"
      }
    }
  }
  ```

---

#### 2. `daftra_create_invoice`
*Description*: Creates a new sales invoice or service charge in Daftra for a client.
- **Input Schema**:
  - `client_id` *(string, required)*: Daftra client ID.
  - `items` *(array of objects, required)*:
    - `item_id` *(string, optional)*: Daftra product/service ID.
    - `description` *(string, required)*: Item or service description.
    - `unit_price` *(number, required)*: Price per unit.
    - `quantity` *(number, required)*: Quantity ordered.
  - `notes` *(string, optional)*: Additional invoice notes or call reference.
  - `payment_status` *(string, optional)*: `"draft" | "unpaid" | "paid"`.

- **Sample Response**:
  ```json
  {
    "ok": true,
    "domain": "accounting",
    "action": "daftra_create_invoice",
    "data": {
      "invoiceId": "INV-2026-884",
      "daftraId": 4591,
      "clientId": "1042",
      "totalAmount": 450.00,
      "status": "unpaid",
      "invoiceUrl": "https://alazab.daftra.com/owner/invoices/view/4591"
    }
  }
  ```

---

#### 3. `daftra_list_invoices`
*Description*: Lists and filters client invoices from Daftra.
- **Input Schema**:
  - `client_id` *(string, optional)*: Filter by Daftra client ID.
  - `status` *(string, optional)*: Filter by status (`"paid" | "unpaid" | "overdue"`).
  - `limit` *(number, optional)*: Maximum number of records (default: 20).

- **Sample Response**:
  ```json
  {
    "ok": true,
    "domain": "accounting",
    "action": "daftra_list_invoices",
    "data": {
      "count": 2,
      "invoices": [
        { "id": "4591", "number": "INV-2026-884", "total": 450.00, "status": "unpaid", "date": "2026-08-31" },
        { "id": "4210", "number": "INV-2026-512", "total": 1200.00, "status": "paid", "date": "2026-07-15" }
      ]
    }
  }
  ```

---

#### 4. `daftra_record_payment`
*Description*: Records a payment receipt against an outstanding Daftra invoice.
- **Input Schema**:
  - `invoice_id` *(string, required)*: Daftra invoice ID.
  - `amount` *(number, required)*: Paid amount.
  - `payment_method` *(string, required)*: `"bank_transfer" | "credit_card" | "cash" | "pos"`.
  - `transaction_reference` *(string, optional)*: Bank or payment gateway reference ID.

- **Sample Response**:
  ```json
  {
    "ok": true,
    "domain": "accounting",
    "action": "daftra_record_payment",
    "data": {
      "paymentId": "PAY-9912",
      "invoiceId": "4591",
      "amountPaid": 450.00,
      "remainingBalance": 0.00,
      "invoiceStatus": "paid"
    }
  }
  ```

---

#### 5. `daftra_check_inventory`
*Description*: Checks inventory stock level, availability, and pricing for a product or service in Daftra.
- **Input Schema**:
  - `search` *(string, required)*: Product name, SKU, or keyword.

- **Sample Response**:
  ```json
  {
    "ok": true,
    "domain": "accounting",
    "action": "daftra_check_inventory",
    "data": {
      "count": 1,
      "products": [
        {
          "id": "209",
          "name": "باقة الدعم الهاتفي المتقدم",
          "sku": "SRV-VOICE-ADV",
          "price": 450.00,
          "stockQuantity": 999,
          "available": true
        }
      ]
    }
  }
  ```

---

## 5. Adding New MCP Connectors (Developer Guide)

To add a new integration (e.g. CRM, Payment Gateway, Shipping Provider):

1. Create a connector file under `server/mcp/connectors/<domain>.ts`.
2. Define Zod schemas for tool inputs and outputs.
3. Export a registration function matching `(server: McpServer, agent: RuntimeAgent) => void`.
4. Register the connector inside `server/mcp/index.ts`.

This modular approach guarantees that all future Alazab expansions remain clean, isolated, and strictly type-safe without touching core protocol logic.

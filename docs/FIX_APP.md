أنت تعمل على مشروعين:

### المشروع الرئيسي

`https://github.com/AlazabDev/az-agent-call`

وهو النظام الذي يجب أن يصبح:

**Alazab Agent Call Center / مركز اتصال الوكلاء المركزي**

### المصدر المراد دمجه

الحزمة:

`daftra_mcp.zip`

وقد تم فحصها، وهي تحتوي بالفعل على Daftra MCP حقيقي يتضمن:

* Daftra HTTP Client.
* Clients.
* Products.
* Sales Invoices.
* Payments.
* Suppliers.
* Purchase Orders.
* Expenses.
* Incomes.
* Smart Entity Resolver.
* Knowledge Base.
* Local cleaned database.
* Account metadata sync.
* Raw API tool.
* MCP server مستقل.
* UI مستقل.

المطلوب ليس تشغيل النظامين بجانب بعضهما.

# الهدف الرئيسي

قم بعمل **Professional Deep Integration** بحيث يتم تفكيك `daftra_mcp` ونقل وظائف Daftra الصحيحة والمفيدة إلى قلب:

`az-agent-call`

ليصبح Daftra جزءًا أصيلًا من مركز اتصال الوكلاء.

يجب أن تصبح المعمارية:

```text
Phone / Call / Customer
        │
        ▼
Az Agent Call Center
        │
        ├── Agent Identity
        ├── Call Session
        ├── Customer Context
        ├── Telephony
        ├── Daftra ERP
        ├── Templates / Messaging
        └── Foundry Agent Runtime
```

وليس:

```text
az-agent-call
      │
      └── external daftra-mcp application
```

---

# 1. قاعدة أساسية: لا تنسخ مشروع Daftra بالكامل

ممنوع نسخ:

```text
daftra_mcp/src/server.ts
```

كمخدم ثانٍ.

ممنوع إنشاء:

```text
/daftra/v1
/daftra/v2
```

كـMCP Server مستقل إذا لم توجد ضرورة معمارية حقيقية.

ممنوع تشغيل:

```text
Daftra Express Server
+
Az Agent Call Express Server
```

داخل نفس التطبيق.

المشروع الرئيسي يملك بالفعل MCP runtime.

المطلوب نقل **Daftra Domain Logic** إليه.

---

# 2. الملفات التي تعتبر مصدرًا أساسيًا للدمج

استفد من المنطق الموجود داخل:

```text
daftra_mcp/src/client/daftraClient.ts

daftra_mcp/src/tools/smartResolver.ts
daftra_mcp/src/tools/clients.ts
daftra_mcp/src/tools/products.ts
daftra_mcp/src/tools/invoices.ts
daftra_mcp/src/tools/purchases.ts
daftra_mcp/src/tools/expenses.ts

daftra_mcp/src/syncEngine.ts

daftra_mcp/src/resources/knowledgeBase.ts
daftra_mcp/src/resources/referenceData.ts
```

لكن لا تنسخها حرفيًا.

قم بإعادة هندستها لكي تتوافق مع:

* NodeNext.
* TypeScript strict.
* Zod.
* MCP SDK المستخدم حاليًا في `az-agent-call`.
* RuntimeAgent.
* Supabase audit.
* Agent RBAC.
* Call session context.
* النظام الحالي للأخطاء والاستجابات.

---

# 3. ممنوع نقل الأسرار والبيانات

الحزمة `daftra_mcp.zip` تحتوي ملف:

```text
.env
```

يحتوي على متغيرات تشغيل حقيقية.

**ممنوع منعًا باتًا نسخه أو رفعه أو Commit أي قيمة منه إلى GitHub.**

كذلك ممنوع Commit:

```text
data/daftra_cleaned.sqlite
data/cleaned/*
backup_csv/*
data/account_cache.json
```

لأن المستودع الرئيسي Public وقد تحتوي هذه الملفات على:

* بيانات عملاء.
* معاملات.
* فواتير.
* موردين.
* أسعار.
* بيانات مالية.
* أرقام واتصالات.

أضف أو تأكد من وجود قواعد `.gitignore` تمنع:

```gitignore
.env
.env.*
!.env.example

data/*.sqlite
data/cleaned/
backup_csv/
data/account_cache.json

*.db
*.sqlite
*.sqlite3
```

ولا تستخدم بيانات Production حقيقية كـfixture للاختبارات.

---

# 4. المعمارية المستهدفة لـDaftra

أنشئ داخل `az-agent-call`:

```text
server/daftra/
├── config.ts
├── client.ts
├── errors.ts
├── types.ts
├── schemas.ts
├── normalizer.ts
├── resolver.ts
├── service.ts
├── health.ts
├── audit.ts
└── modules/
    ├── clients.ts
    ├── products.ts
    ├── invoices.ts
    ├── payments.ts
    ├── suppliers.ts
    ├── purchases.ts
    ├── expenses.ts
    ├── incomes.ts
    └── work-orders.ts
```

ثم:

```text
server/mcp/connectors/daftra/
├── index.ts
├── clients.ts
├── products.ts
├── invoices.ts
├── payments.ts
├── purchases.ts
├── expenses.ts
├── resolver.ts
└── context.ts
```

`server/daftra/*`

مسؤول عن Daftra API نفسه.

بينما:

`server/mcp/connectors/daftra/*`

مسؤول فقط عن تحويل وظائف Daftra إلى MCP Tools خاصة بالوكلاء.

لا تخلط الطبقتين.

---

# 5. Daftra Client الحقيقي

استفد من:

```text
daftra_mcp/src/client/daftraClient.ts
```

ولكن حسنه.

استخدم:

```text
DAFTRA_BASE_URL
DAFTRA_SUBDOMAIN
DAFTRA_AUTH_MODE
DAFTRA_API_KEY
DAFTRA_ACCESS_TOKEN
DAFTRA_TIMEOUT
DAFTRA_PAGE_LIMIT
```

اجعل القيم Server Side فقط.

لا تستخدم:

```text
VITE_DAFTRA_*
```

لأي credential.

أنشئ Client مركزيًا يدعم:

```text
GET
POST
PUT
DELETE
```

مع:

* AbortController timeout.
* structured errors.
* Daftra HTTP status.
* request ID.
* safe logging.
* عدم تسجيل API key.
* عدم تسجيل Authorization header.
* response parsing.
* pagination.
* retry للقراءات الآمنة فقط.
* عدم retry العشوائي للعمليات المالية.

---

# 6. لا تستخدم Mock Daftra الموجود حاليًا

احذف implementation الوهمي الحالي داخل:

```text
server/mcp/connectors/daftra.ts
```

الذي يقوم بإرجاع أشياء مثل:

```text
client@alazab.com
INV-2026-884
stockQuantity: 999
Math.random()
PAY-xxxx
```

كل أداة يجب أن تتصل بـDaftra الحقيقي.

إذا Daftra غير مهيأ:

```json
{
  "ok": false,
  "code": "DAFTRA_NOT_CONFIGURED"
}
```

إذا API غير متاح:

```json
{
  "ok": false,
  "code": "DAFTRA_UNAVAILABLE"
}
```

ممنوع توليد نجاح وهمي.

---

# 7. Smart Entity Resolution أساسي وليس اختياريًا

الـSmart Resolver الموجود في الحزمة مهم جدًا ويجب تطويره وليس حذفه.

الهدف أن يفهم الوكيل:

```text
مؤسسة عوف
أبو عوف
Abu Auf
AUF
اربيسك
Arabesque
ماربل جولد
Marble Gold
```

ويحول الاسم إلى ID الصحيح في Daftra.

أنشئ Resolver مركزيًا.

الكيانات على الأقل:

```text
client
supplier
product
work_order
cost_center
treasury
invoice
```

نفذ pipeline:

```text
raw query
   ↓
normalization
   ↓
exact ID
   ↓
exact normalized name
   ↓
phone/email/SKU lookup
   ↓
aliases/transliteration
   ↓
controlled fuzzy match
   ↓
result confidence
```

ممنوع اختيار أول نتيجة عشوائيًا.

---

# 8. مشكلة resolver الحالية يجب إصلاحها

النسخة الحالية تستخدم:

```ts
strVal.includes(v)
```

ثم تعيد أول نتيجة.

هذا غير كافٍ للعمليات المالية.

أنشئ نتيجة مثل:

```ts
type ResolutionResult =
  | {
      status: "resolved";
      id: number;
      entityType: string;
      confidence: number;
      matchType: "id" | "exact" | "alias" | "normalized" | "fuzzy";
      entity: unknown;
    }
  | {
      status: "ambiguous";
      matches: unknown[];
    }
  | {
      status: "not_found";
      query: string;
    };
```

إذا أكثر من عميل مناسب:

```text
AMBIGUOUS_ENTITY
```

ويجب ألا تنفذ فاتورة أو دفعة حتى يتم تحديد الكيان الصحيح.

---

# 9. Caller → Daftra Context

هذه أهم نقطة في عملية الدمج.

أنشئ أداة/خدمة مركزية:

```text
daftra_lookup_caller_context
```

عند وجود مكالمة واردة أو صادرة، استخدم رقم الهاتف من Call Session.

مثال:

```text
+201xxxxxxxxx
```

نفذ:

```text
normalize phone
      ↓
Daftra client lookup
      ↓
client profile
      ↓
recent invoices
      ↓
unpaid balance
      ↓
projects/work orders
      ↓
recent transactions
```

ثم أعد Customer Context موحدًا.

مثل:

```json
{
  "client": {},
  "openInvoices": [],
  "recentInvoices": [],
  "workOrders": [],
  "balance": {},
  "matchedBy": "phone"
}
```

---

# 10. مركز الاتصال يجب أن يعرف العميل تلقائيًا

عندما تبدأ المكالمة:

```text
Call Session Created
       ↓
Phone normalized
       ↓
Daftra Lookup
       ↓
Customer identified
       ↓
Customer 360 panel
```

إذا وجد عميل واحد:

اربطه تلقائيًا بالـCall Session.

إذا لم يوجد:

```text
Unknown Caller
```

إذا وجد أكثر من عميل:

```text
Ambiguous Caller
```

ولا تختار تلقائيًا.

---

# 11. Customer 360 داخل شاشة الوكيل

أضف داخل واجهة مركز الاتصال Panel باسم:

```text
دفترة
```

أو:

```text
ERP / Daftra
```

ويظهر أثناء المكالمة.

يعرض:

### العميل

```text
الاسم
رقم العميل
الهاتف
البريد
الشركة
الحالة
```

### الحساب

```text
إجمالي الفواتير
المدفوع
المتبقي
الفواتير المتأخرة
```

### آخر العمليات

```text
آخر فواتير
آخر دفعات
آخر أوامر شراء
آخر مشروع/أمر شغل
```

### المنتجات والخدمات

البحث المباشر داخل Daftra.

---

# 12. لا تنشئ نسخة ثانية من شاشة Clients

المشروع الرئيسي يحتوي بالفعل على صفحات مثل:

```text
Clients
Finance
Projects
Accounts
AgentChat
```

المطلوب إعادة ربطها تدريجيًا بالـDaftra Service الحقيقي.

لا تنقل React UI الموجودة داخل `daftra_mcp` بالكامل.

استخدم UI مركز الاتصال الحالي.

Daftra يصبح **Data/Action Provider** للواجهة وليس تطبيقًا ثانيًا.

---

# 13. أدوات MCP المطلوب دمجها

احتفظ بالأدوات المفيدة من الحزمة ولكن نظمها.

## Entity Resolution

```text
daftra_search_entities
daftra_lookup_caller_context
```

## Clients

```text
daftra_list_clients
daftra_get_client
daftra_create_client
```

## Products

```text
daftra_list_products
daftra_get_product
daftra_search_products
daftra_list_categories
daftra_create_product
```

## Invoices

```text
daftra_list_invoices
daftra_get_invoice
daftra_create_invoice
daftra_create_smart_invoice
```

## Payments

اعتمد اسمًا موحدًا:

```text
daftra_add_invoice_payment
```

ولا تحتفظ بأداتين بنفس الغرض مثل:

```text
daftra_record_payment
daftra_add_invoice_payment
```

إلا إذا كان بينهما فرق موثق.

## Suppliers

```text
daftra_list_suppliers
daftra_get_supplier
daftra_create_supplier
```

## Purchase Orders

```text
daftra_list_purchase_orders
daftra_get_purchase_order
daftra_create_purchase_order
daftra_create_smart_purchase_order
```

## Expenses

```text
daftra_list_expenses
daftra_create_expense
daftra_create_smart_expense
```

## Income

```text
daftra_list_incomes
```

## Work Orders

أضف أدوات واضحة:

```text
daftra_search_work_orders
daftra_get_work_order
```

---

# 14. لا تنقل daftra_raw_request كأداة عامة

الحزمة تحتوي:

```text
daftra_raw_request
```

الذي يستطيع:

```text
GET
POST
PUT
DELETE
```

على أي endpoint.

**لا تسجله لكل Agent.**

هذا خطر لأنه يسمح بتجاوز جميع صلاحيات الأدوات الأخرى.

الأفضل:

إزالته من MCP Production تمامًا.

إذا احتجناه للإدارة والتشخيص، يكون Internal Admin utility فقط مثل:

```text
server/daftra/adminRawRequest.ts
```

مع:

* endpoint allowlist.
* platform_admin only.
* disabled by default.
* audit log.
* لا يكون MCP tool عادي.

---

# 15. قاعدة البيانات المحلية ليست Source of Truth

الحزمة تحتوي:

```text
data/daftra_cleaned.sqlite
```

وملفات JSON من Backup.

هذه مفيدة للتحليل والـKnowledge فقط.

لكن في مركز الاتصال:

```text
Daftra Live API = Source of Truth
```

والنسخة المحلية:

```text
optional read-only cache/reference
```

ممنوع تنفيذ عملية مالية اعتمادًا على SQLite القديم.

مثال:

إنشاء فاتورة يجب أن يحل العميل والمنتج من Daftra Live قبل التنفيذ.

---

# 16. إصلاح databaseQuery

لا تنقل:

```text
daftra_query_cleaned_db
```

بصورته الحالية.

لا تسمح للAgent بإرسال SQL Arbitrary.

بدلًا منه أنشئ أدوات محددة:

```text
daftra_reference_search_products
daftra_reference_search_clients
daftra_reference_financial_summary
```

أو Query Builder مضبوط.

ممنوع:

```text
PRAGMA
WITH arbitrary SQL
raw SQL from model
```

في Production Agent Tools.

---

# 17. Knowledge Base

Knowledge Base الحالية مفيدة كـRAG/reference layer.

لكن لا تضع معلومات العملاء والماليات الحساسة داخل المستودع العام.

غير النظام ليقرأ KB من:

```text
private storage
Supabase private bucket
or generated runtime cache
```

وليس ملفات بيانات حساسة committed في Git.

يمكن الاحتفاظ بـ:

```text
daftra_search_knowledge_base
```

لكن يجب أن يكون المصدر Private.

---

# 18. Agent Capability Matrix

لا تعطي كل أدوات Daftra لجميع الوكلاء.

اعتمد:

```text
default deny
```

أنشئ:

```text
server/mcp/capabilities.ts
```

مثال:

```ts
type AgentCapability =
  | "daftra.clients.read"
  | "daftra.clients.write"
  | "daftra.products.read"
  | "daftra.products.write"
  | "daftra.invoices.read"
  | "daftra.invoices.create"
  | "daftra.payments.create"
  | "daftra.suppliers.read"
  | "daftra.suppliers.write"
  | "daftra.purchases.read"
  | "daftra.purchases.create"
  | "daftra.expenses.read"
  | "daftra.expenses.create"
  | "daftra.work_orders.read";
```

---

# 19. الوكلاء الحاليون

المشروع يحتوي:

```text
backend
azabot
auth
prod
maint
core
bim
finance
payments
copilot
project
vision
```

ابنِ صلاحيات مناسبة.

مثال مبدئي:

## finance

```text
clients.read
products.read
invoices.read
invoices.create
suppliers.read
purchases.read
expenses.read
expenses.create
work_orders.read
```

## payments

```text
clients.read
invoices.read
payments.create
```

## project

```text
clients.read
products.read
suppliers.read
purchases.read
work_orders.read
```

## bim

```text
clients.read
products.read
work_orders.read
```

## maint

```text
clients.read
products.read
invoices.read
work_orders.read
```

## prod

```text
products.read
suppliers.read
purchases.read
```

## copilot

قراءة واسعة:

```text
clients.read
products.read
invoices.read
suppliers.read
purchases.read
expenses.read
work_orders.read
```

لكن:

```text
NO FINANCIAL WRITES
```

افتراضيًا.

## vision

```text
products.read
```

## auth

```text
NO DAFTRA ACCESS
```

## backend/core

صلاحيات الإدارة المطلوبة حسب التصميم.

لا تجعل هذه القائمة hardcoded داخل كل Connector.

أنشئ capability registry مركزيًا.

---

# 20. Tool Registration حسب الوكيل

الكود الحالي يقوم بـ:

```ts
registerDaftraConnector(server, agent);
```

ثم يسجل كل الأدوات.

غير ذلك بحيث الأدوات نفسها تُسجل حسب capability.

مثال:

```ts
if (hasCapability(agent, "daftra.invoices.read")) {
  registerInvoiceReadTools(server, agent);
}
```

والتحقق يجب أن يحدث أيضًا داخل execution layer كـdefense in depth.

---

# 21. Call Session Context

كل عملية Daftra تتم أثناء مكالمة يجب أن تستطيع استقبال context داخلي:

```ts
{
  agentId,
  callSessionId,
  callerPhone,
  clientId,
  toolName,
  timestamp,
  requestId
}
```

ولا تعتمد على النموذج لكي يرسل `agentId`.

الـAgent identity يجب أن يأتي من Bearer Token الموجود حاليًا.

والـCall Session يجب أن يأتي من server-side context.

---

# 22. Daftra Audit Trail

أنشئ جدولًا مثل:

```text
agent_erp_actions
```

أو:

```text
daftra_action_log
```

الحقول:

```text
id
agent_id
call_session_id
action
entity_type
entity_id
request_id
success
http_status
error_code
started_at
completed_at
duration_ms
metadata
```

لا تسجل:

```text
API_KEY
Authorization
Passwords
full sensitive payloads
```

---

# 23. ربط Call Session بالعميل

أضف داخل Call Session:

```text
daftra_client_id
daftra_client_name
customer_match_status
customer_match_source
```

أو أنشئ جدول relationship مناسب.

لا تجعل بيانات Daftra duplicated بالكامل داخل Call table.

احفظ IDs وsnapshot مختصر فقط عند الحاجة للـaudit.

---

# 24. سيناريو المكالمة الحقيقي

يجب دعم السيناريو التالي:

```text
Incoming Call
   ↓
رقم العميل +201xxxxxxxxx
   ↓
Call Session
   ↓
Daftra Lookup
   ↓
تم التعرف على مؤسسة عوف
   ↓
عرض:
- حساب العميل
- المشاريع
- آخر الفواتير
- المديونية
   ↓
الوكيل يسأل:
"فاتورة مشروع أربيسك الأخيرة كام؟"
   ↓
Agent
   ↓
daftra_search_entities("اربيسك")
   ↓
daftra_list_invoices(...)
   ↓
إجابة حقيقية
```

---

# 25. سيناريو إنشاء فاتورة

مثال:

```text
"اعمل فاتورة للعميل مؤسسة عوف في مشروع أربيسك"
```

التدفق:

```text
resolve client
      ↓
resolve project/work_order
      ↓
resolve items
      ↓
validate
      ↓
capability check
      ↓
create draft invoice
      ↓
Daftra API
      ↓
store audit
      ↓
return actual Daftra ID
```

لا تستخدم IDs مفترضة.

---

# 26. العمليات المالية عالية الحساسية

فرق بين:

```text
READ
DRAFT CREATE
FINAL FINANCIAL WRITE
PAYMENT
```

مثال:

إنشاء Draft invoice أقل حساسية من:

```text
record payment
```

يجب أن تكون:

```text
daftra.payments.create
```

صلاحية منفصلة.

ولا تجعل Agent يملكها بسبب امتلاكه:

```text
daftra.invoices.create
```

---

# 27. Idempotency

عمليات مثل:

```text
create invoice
create purchase order
create expense
record payment
```

يجب حمايتها من التكرار الناتج عن:

* MCP retry.
* network timeout.
* Agent retry.
* user double click.

أنشئ internal:

```text
operation_id
```

وسجل العملية قبل/بعد Daftra request.

إذا أمكن استخدام external reference في Daftra، استخدمه.

لا تعيد تنفيذ نفس العملية تلقائيًا بعد Timeout إذا كان من الممكن أن تكون العملية قد نجحت في Daftra.

---

# 28. Daftra Health

أنشئ:

```text
server/daftra/health.ts
```

ويعيد:

```text
configured
reachable
authenticated
latency
lastSuccessfulRequest
lastError
```

لكن بدون تسريب credential.

داخل `/readyz`:

Daftra يكون:

```text
optional dependency
```

إلا إذا أصبح تشغيل التطبيق بالكامل يعتمد عليه.

لا تجعل سقوط Daftra يسقط Telephony.

---

# 29. Environment

أضف إلى:

```text
.env.example
docker-compose.yml
```

المتغيرات اللازمة فقط:

```text
DAFTRA_BASE_URL=
DAFTRA_SUBDOMAIN=
DAFTRA_AUTH_MODE=apikey
DAFTRA_API_KEY=
DAFTRA_ACCESS_TOKEN=
DAFTRA_TIMEOUT=30000
DAFTRA_PAGE_LIMIT=50
```

لا تضع قيم حقيقية.

---

# 30. صحح أسماء Environment القديمة

في مشروع Daftra يوجد:

```text
DAFTRA_PASSWARD
DAFTRA_CLIENT_USERNAM
DAFTRA_CLIENT_PASSWARD
```

لا تعتمد الأخطاء الإملائية كأسماء Canonical جديدة.

اعتمد:

```text
DAFTRA_PASSWORD
DAFTRA_USERNAME
```

إن كانت مطلوبة.

ويمكن دعم الاسم القديم مؤقتًا كـlegacy fallback فقط مع تعليق واضح.

---

# 31. Frontend API

الـBrowser لا يتصل مباشرة بـDaftra.

ممنوع:

```text
React → Daftra API
```

المطلوب:

```text
React
  ↓
Az Agent Call Backend
  ↓
authorization
  ↓
Daftra Service
  ↓
Daftra
```

---

# 32. صفحة Clients

حوّل `/clients` إلى صفحة فعلية.

يجب أن تقرأ من Daftra من خلال backend.

تدعم:

```text
search
phone
email
business name
client ID
```

ثم تعرض:

```text
Client details
Invoices
Projects
Balance
Recent activity
```

---

# 33. Finance

اربط صفحة:

```text
/finance
```

بالبيانات الحقيقية.

اعرض:

```text
Invoices
Paid
Unpaid
Overdue
Expenses
Income
Payments
```

حسب صلاحية المستخدم.

---

# 34. Projects

اربط Projects مع:

```text
Daftra Work Orders
```

مع الحفاظ على أي Project system مستقل موجود في مجموعة العزب.

لا تفترض أن كل Project داخلي = Daftra Work Order.

أنشئ mapping واضح إذا كان النظامان مختلفين.

---

# 35. AgentChat

عندما يطلب المستخدم داخل AgentChat:

```text
ابحث عن العميل أبو عوف
```

يتم استدعاء:

```text
daftra_search_entities
```

الحقيقي.

وعندما يقول:

```text
هات الفواتير غير المسددة
```

يتم استدعاء Daftra API.

وعندما يقول:

```text
اعمل فاتورة شراء...
```

يجب أن يذهب للوكيل المخول والأداة الصحيحة.

ممنوع `generateAgentResponse()` أو أي canned response.

---

# 36. Tool Responses

وحّد response format.

مثال نجاح:

```json
{
  "ok": true,
  "domain": "daftra",
  "action": "daftra_get_client",
  "data": {},
  "meta": {
    "agentId": "finance",
    "requestId": "...",
    "timestamp": "..."
  }
}
```

مثال خطأ:

```json
{
  "ok": false,
  "domain": "daftra",
  "action": "daftra_create_invoice",
  "code": "AMBIGUOUS_ENTITY",
  "error": "...",
  "data": {
    "matches": []
  }
}
```

---

# 37. أخطاء موحدة

اعتمد على الأقل:

```text
DAFTRA_NOT_CONFIGURED
DAFTRA_AUTH_FAILED
DAFTRA_UNAVAILABLE
DAFTRA_TIMEOUT
DAFTRA_VALIDATION_ERROR
DAFTRA_NOT_FOUND
ENTITY_NOT_FOUND
AMBIGUOUS_ENTITY
CAPABILITY_DENIED
DUPLICATE_OPERATION
DAFTRA_WRITE_UNCERTAIN
```

`DAFTRA_WRITE_UNCERTAIN` مهم جدًا:

إذا انتهى request بـtimeout بعد إرساله ولم نعرف هل Daftra نفذه أم لا، لا تقل إنه Failed وتعيد التنفيذ مباشرة.

---

# 38. لا تنقل CORS و/Api/connect من Daftra MCP

الحزمة الحالية تحتوي endpoint:

```text
POST /api/connect
```

يسمح بتغيير:

```text
subdomain
apiKey
username
```

في runtime.

ممنوع نقل هذا التصميم.

Credentials يجب إدارتها Server Side من Environment/Secret Store.

لا تجعل Browser يغير Daftra API key.

---

# 39. لا تنقل MCP SSE Server المستقل

لا نحتاج:

```text
/daftra/v1/sse
/daftra/v2/sse
```

من المشروع القديم.

استخدم MCP runtime الحالي الموجود في `az-agent-call`.

Daftra Domain يظهر كأدوات للوكيل المصادق عليه.

---

# 40. Supabase Control Plane

اربط Daftra داخل Control Plane الحالي.

أضف ما يلزم لتخزين:

```text
agent capabilities
ERP action audit
call-client links
optional resolver aliases
idempotency operations
```

يمكن إنشاء جداول مثل:

```text
agent_capabilities
daftra_action_log
daftra_entity_aliases
daftra_operations
call_customer_links
```

مع RLS صحيحة.

---

# 41. Aliases

بدل hardcoded transliteration فقط:

```ts
if (q.includes("عوف")) ...
```

أنشئ table أو configuration:

```text
daftra_entity_aliases
```

مثال:

```text
entity_type: client
entity_id: 11
alias: عوف

entity_type: client
entity_id: 11
alias: Abu Auf

entity_type: work_order
entity_id: 68
alias: اربيك

entity_type: work_order
entity_id: 68
alias: Arabesque
```

وبذلك يمكن تحسين resolver بدون تعديل الكود.

---

# 42. Security

نفذ مراجعة خاصة على:

```text
Raw API
SQL Query
Financial Writes
Secrets
Logs
Client PII
Call recordings
Daftra credentials
```

المستودع Public.

لذلك:

**لا Commit لأي بيانات عميل أو مفتاح أو Backup حقيقي.**

---

# 43. الاختبارات

أنشئ Tests حقيقية لـDaftra Integration.

على الأقل:

```text
daftra client request headers
authentication configuration
timeout
error mapping
resolver exact matching
resolver alias matching
ambiguous matching
client lookup by phone
invoice listing
invoice creation validation
payment permission
purchase permission
capability denial
idempotency
write uncertain behavior
call-session linking
audit logging
credential redaction
```

استخدم mocked HTTP server داخل tests فقط.

Mock داخل test مقبول.

Mock داخل Production code ممنوع.

---

# 44. Migration Strategy

نفذ الدمج على مراحل داخل نفس branch.

## Phase 1

```text
server/daftra core
```

## Phase 2

```text
resolver
```

## Phase 3

```text
read tools
```

## Phase 4

```text
agent capabilities
```

## Phase 5

```text
financial write tools
```

## Phase 6

```text
call customer context
```

## Phase 7

```text
frontend Customer 360
```

## Phase 8

```text
AgentChat integration
```

## Phase 9

```text
tests + production validation
```

---

# 45. لا تحذف daftra_mcp قبل الاستفادة منه

استخدم الحزمة كمصدر مرجعي أثناء النقل.

قارن جميع الأدوات الموجودة فيها.

تأكد أنه لم يتم فقد وظيفة مهمة أثناء الدمج.

لكن لا تحتفظ بتطبيقين متوازيين في النهاية.

النتيجة المطلوبة:

```text
az-agent-call
```

هو النظام الوحيد.

وداخله:

```text
Telephony
Daftra
Messaging
Foundry Agents
Call Context
Admin
Audit
```

---

# 46. المطلوب النهائي من المعمارية

أريد أن يصبح مركز اتصال الوكلاء قادرًا على تنفيذ سيناريو مثل:

```text
اتصال وارد من العميل
→ التعرف عليه تلقائيًا من Daftra
→ الوكيل يعرف اسمه وحسابه ومشروعه
→ يعرض آخر فواتيره
→ يبحث عن منتج أو خدمة
→ ينشئ Draft invoice عند الحاجة
→ Finance Agent يستطيع استكمالها
→ Payments Agent يستطيع تسجيل الدفعة
→ كل ذلك مربوط بنفس Call Session
→ جميع العمليات Audited
```

هذا هو معنى دمج Daftra داخل مركز الاتصال.

---

# 47. لا أريد مجرد نقل Tools

الدمج غير مكتمل إذا كانت النتيجة فقط:

```text
registerDaftraConnector(...)
```

مع مجموعة MCP tools.

المطلوب **Business Integration** حقيقي بين:

```text
Agent
Call
Customer
Daftra
Foundry
Audit
UI
```

---

# 48. Production Gates

بعد التعديل نفذ فعليًا:

```bash
npm ci
npm run typecheck
npm test
npm run validate:templates
npm run build
```

ثم:

```bash
docker compose config
docker compose build
```

ثم scan:

```bash
grep -RniE \
'Math\\.random|client@alazab\\.com|INV-2026-884|stockQuantity.*999|PAY-|mock|fake' \
server src
```

راجع النتائج يدويًا.

ثم:

```bash
grep -RniE \
'DAFTRA_API_KEY|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|GITHUB_TOKEN' \
. \
--exclude='.env.example' \
--exclude-dir=node_modules \
--exclude-dir=.git
```

يجب ألا يوجد Secret حقيقي داخل المستودع.

---

# 49. تحقق من Git قبل الانتهاء

نفذ:

```bash
git status --short
git diff --stat
git diff
```

وتأكد تحديدًا أن هذه الأشياء لم تدخل Git:

```text
.env
daftra_cleaned.sqlite
data/cleaned
backup_csv
real API keys
real access tokens
customer backups
financial backups
```

---

# 50. التقرير النهائي

أعطني تقريرًا منظمًا:

### Architecture

ما أصبح داخل مركز الاتصال.

### Migrated

أي أجزاء تم نقلها من `daftra_mcp`.

### Rejected Legacy

أي أجزاء من المشروع القديم لم يتم نقلها ولماذا.

### Daftra Tools

القائمة النهائية للأدوات.

### Agent Permissions

جدول:

```text
Agent | Read | Write | Payments | Purchases | Expenses
```

### Call Integration

كيف يرتبط:

```text
Call Session → Caller → Daftra Client
```

### Security

ما تم عمله بخصوص:

```text
.env
credentials
PII
raw API
SQL
RBAC
```

### Tests

المخرجات الفعلية.

### Build

المخرجات الفعلية.

### Remaining Blockers

أي Credentials أو API endpoint أو Telephony provider غير متاح يجب ذكره بوضوح.

---

# النتيجة المطلوبة

لا أريد:

**Daftra MCP بجوار Az Agent Call.**

أريد:

# Az Agent Call Center

ويحتوي داخله على:

```text
┌────────────────────────────────────┐
│       Alazab Agent Call Center     │
├────────────────────────────────────┤
│ Call / Telephony                   │
│ Agent Identity / Foundry           │
│ Customer 360                       │
│ Daftra ERP                         │
│ Projects / Work Orders             │
│ Products / Inventory               │
│ Sales / Invoices                   │
│ Purchases / Suppliers              │
│ Payments / Finance                 │
│ Templates / Messaging              │
│ Audit / Security                   │
└────────────────────────────────────┘
```

ويصبح Daftra **ERP Engine مدمجًا داخل مركز اتصال الوكلاء**، وليس خدمة منفصلة ولا Mock Connector.

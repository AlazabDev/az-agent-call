أنت تعمل الآن على المستودع التالي:

`https://github.com/AlazabDev/az-agent-call`

المطلوب هو **إصلاح المشروع فعليًا وتحويله إلى Az Agent Call Production حقيقي**، وليس مجرد إعادة تسمية ملفات Az Agent Call Center أو إخفاء الأخطاء.

## قواعد إلزامية

1. اعمل على **الكود الفعلي الموجود في المستودع**.
2. ممنوع إنشاء نجاحات وهمية أو Mock responses داخل أي وظيفة Production.
3. ممنوع حذف مكونات سليمة لمجرد تسهيل إعادة البناء.
4. احتفظ بالأجزاء الجيدة الحالية، خصوصًا:
   - Supabase Auth/RBAC.
   - Agent bearer-token architecture.
   - Token store والتشفير الحالي.
   - Docker hardening.
   - Nginx security headers.
   - React UI architecture.
5. لا تعتبر المشروع جاهزًا حتى ينجح:
   - install
   - typecheck
   - tests
   - build
   - Docker build
   - runtime smoke tests.
6. لا تكتب في التقرير أن وظيفة تعمل إلا إذا كانت متصلة فعليًا بالـbackend/provider المقصود.
7. أي Integration غير متوفر له credentials أو provider يجب أن يرجع بوضوح:
   `NOT_CONFIGURED`
   وليس بيانات تجريبية أو نجاحًا وهميًا.
8. لا تستخدم `Math.random()` لإنشاء IDs يفترض أنها قادمة من نظام خارجي.
9. لا تستخدم بيانات ثابتة كمخرجات أدوات Production.
10. ممنوع ترك صفحات UI تعرض حالات `Connected`, `Online`, `Success`, `Paid`, `Call completed` ما لم تكن الحالة مستندة إلى runtime data حقيقية.

---

# أولًا — تثبيت هوية المشروع

المشروع الحالي خليط بين:

- `az-agent-call`
- `az-agent-call`

وحاليًا توجد أسماء ومسارات متعارضة في:

- `README.md`
- `AUDIT.md`
- `MANIFEST.txt`
- `server/*`
- `src/*`
- `supabase/*`
- `deploy/*`
- `docker-compose.yml`

اعتمد الاسم الرئيسي:

`az-agent-call`

واعتمد MCP endpoint الرئيسي:

`/call`

إذا كان Mail سيظل جزءًا من المنظومة، اجعله Connector مستقلًا داخل Az Agent Call ولا تجعل `/mail` هو الـcanonical endpoint.

يجب توحيد:

- اسم المشروع.
- اسم Docker service.
- container name.
- application directory.
- data directory.
- gateway instance name.
- Supabase settings.
- Edge Function names.
- Nginx routes.
- README.
- MANIFEST.
- UI labels.
- runtime logs.

المسارات الإنتاجية المستهدفة:

```text
/var/www/apps/az-agent-call
/var/lib/az-agent-call/data
```

والـDocker service/container:

```text
az-agent-call
```

---

# ثانيًا — إصلاح Telephony Connector

راجع تحديدًا:

`server/mcp/connectors/telephony.ts`

الوضع الحالي غير مقبول.

`make_call` يقوم باستدعاء `sendAsAgent()` الخاص بالبريد، وهذا يجب إزالته بالكامل من مسار Telephony.

ممنوع استخدام SMTP لتنفيذ أو محاكاة المكالمات.

أنشئ Telephony abstraction واضحة مثل:

```text
server/telephony/
  provider.ts
  types.ts
  service.ts
  providers/
```

ويكون هناك interface واضح مثل:

```ts
interface TelephonyProvider {
  makeCall(...)
  getCall(...)
  hangupCall(...)
  getRecording(...)
  getTranscript(...)
}
```

يجب أن تعتمد الأدوات على Provider حقيقي.

إذا لم يتم تحديد/تهيئة Provider:

```json
{
  "ok": false,
  "code": "TELEPHONY_NOT_CONFIGURED"
}
```

ولا تعلن نجاح المكالمة.

احذف السلوك الحالي الذي يعيد:

- fake transcript.
- `durationSeconds: 45`.
- `recordedAt: new Date()`.
- SMTP message ID كـCall Session ID.

`telephonyReady` يجب أن يعتمد على Telephony provider health وليس `smtpConfigured()`.

---

# ثالثًا — إنشاء Call Persistence حقيقي

أضف Supabase migrations جديدة مخصصة لـAz Agent Call.

لا تستخدم `call_logs` كسجل مكالمات.

أنشئ على الأقل تصميمًا مناسبًا للجداول التالية:

```text
call_providers
call_lines
call_sessions
call_events
call_recordings
call_transcripts
call_agent_assignments
```

يفضل أن يحتوي `call_sessions` على معلومات مثل:

```text
id
provider
provider_call_id
agent_id
direction
from_number
to_number
status
started_at
answered_at
ended_at
duration_seconds
recording_status
transcript_status
created_at
updated_at
```

و`call_events` يسجل lifecycle events القادمة من provider/webhook.

احرص على:

- indexes.
- foreign keys.
- RLS.
- service-role writes.
- authenticated admin reads.
- timestamps.
- provider event deduplication.

---

# رابعًا — Webhooks وحالة المكالمات

يجب دعم lifecycle حقيقي للمكالمة:

```text
queued
ringing
in_progress
completed
busy
no_answer
failed
canceled
```

أضف endpoint مناسب لاستقبال Provider webhooks.

نفذ:

- signature validation إذا كان المزود يدعمها.
- event deduplication.
- provider-call-id mapping.
- status persistence.
- recording metadata persistence.
- transcript status persistence.

ممنوع اعتبار المكالمة `completed` لمجرد نجاح HTTP request الخاص ببدء الاتصال.

---

# خامسًا — إصلاح Daftra Connector بالكامل

راجع:

`server/mcp/connectors/daftra.ts`

احذف كل البيانات التجريبية الحالية.

يجب ألا يبقى أي:

```ts
Math.random()
```

لإنشاء Daftra IDs.

ولا أي:

```text
INV-2026-884
PAY-xxxx
stockQuantity: 999
client@alazab.com
```

كمخرجات افتراضية.

أنشئ adapter حقيقي مثل:

```text
server/daftra/
  client.ts
  types.ts
  errors.ts
  entityResolver.ts
```

استخدم:

```text
DAFTRA_BASE_URL
DAFTRA_SUBDOMAIN
DAFTRA_API_KEY
```

فعليًا في HTTP requests.

أضف هذه المتغيرات كذلك إلى بيئة Docker production.

يجب تنفيذ الأدوات الحالية ضد Daftra API الحقيقي:

```text
daftra_get_client
daftra_create_invoice
daftra_list_invoices
daftra_record_payment
daftra_check_inventory
```

مع:

- request validation.
- response validation.
- HTTP timeout.
- error mapping.
- retry فقط للطلبات الآمنة/idempotent.
- عدم retry للعمليات المالية POST بدون idempotency protection.
- logs بدون كشف API key.

---

# سادسًا — Entity Resolution لدفترة

لا تعتمد فقط على IDs.

أنشئ Name Resolution layer لتحويل:

```text
اسم العميل
اسم المورد
اسم المشروع
اسم المنتج
اسم الخدمة
```

إلى Daftra IDs.

يجب:

1. البحث بالاسم/الهاتف/البريد/SKU حسب نوع الكيان.
2. التطبيع العربي والإنجليزي.
3. exact match أولًا.
4. normalized match ثانيًا.
5. fuzzy matching بحذر.
6. عدم تنفيذ write إذا كانت النتيجة ambiguous.

مثال:

```json
{
  "code": "AMBIGUOUS_ENTITY",
  "matches": [...]
}
```

أفضل من اختيار ID بالتخمين.

---

# سابعًا — Capability / RBAC للأدوات

حاليًا كل Agent يحصل على:

```ts
registerTelephonyConnector(...)
registerTemplatesConnector(...)
registerDaftraConnector(...)
```

بدون صلاحيات domain-specific.

أنشئ capability matrix مركزية.

مثال مبدئي:

```text
core:
  telephony.read
  telephony.call
  templates.read

finance:
  daftra.clients.read
  daftra.invoices.read
  daftra.invoices.create

payments:
  daftra.invoices.read
  daftra.payments.create

vision:
  no financial writes

copilot:
  no financial writes
```

ويجب منع تسجيل MCP tool من الأصل إذا لم يكن Agent يملك capability المناسبة، أو رفض التنفيذ server-side.

ممنوع الاعتماد على وصف الـAgent داخل prompt كحماية.

---

# ثامنًا — فصل Mail عن Call

البريد الحالي يمكن الاحتفاظ به لأنه أكثر نضجًا من Call layer.

لكن:

- `server/mailer.ts` يبقى Mail service فقط.
- Telephony لا يستدعي Mailer.
- Call logs لا تستخدم `call_logs`.
- Call readiness لا تستخدم SMTP readiness.
- Dashboard لا تعتبر mail sends مكالمات.

إذا بقيت أدوات:

```text
send_email
send_template_email
```

اجعلها تحت Mail/Templates connector واضح، بدون تسميتها voice call operations.

---

# تاسعًا — إصلاح MCP endpoint

اعتمد:

```text
POST /call
```

كـcanonical MCP endpoint.

راجع:

`server/index.ts`

وأزل ازدواجية `/call` و`/mail` إلا إذا كان هناك سبب معماري موثق.

حدّث:

`deploy/mcp.alazab.com`

ليحتوي على:

```nginx
location = /call {
    proxy_pass http://127.0.0.1:3300;
    ...
}
```

ووحّد نفس القيمة في:

- README.
- MANIFEST.
- server readiness.
- API settings.
- React UI.
- Foundry settings.
- deployment output.
- Supabase settings.

---

# عاشرًا — إصلاح Docker وDeployment

راجع:

`Dockerfile`

غيّر:

```dockerfile
COPY package.json ./
RUN npm install
```

إلى استخدام lockfile الحقيقي:

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
```

ما لم يوجد سبب تقني موثق يمنع ذلك.

راجع:

`docker-compose.yml`

واجعل كل الأسماء متوافقة مع:

```text
az-agent-call
```

وأضف متغيرات Daftra وTelephony المطلوبة.

أصلح:

`deploy/install-production.sh`
`deploy/update-production.sh`
`deploy/verify-production.sh`

بحيث لا يوجد أي reference إلى:

```text
az-agent-call
```

إذا لم يكن مقصودًا كخدمة مستقلة.

أصلح كذلك:

```text
APP_DIR
DATA_DIR
docker compose logs
docker compose exec
docker ps filters
```

ليستخدموا `az-agent-call`.

---

# الحادي عشر — MAILBOX_PASSWORD_PATTERN

لا تجعل:

```yaml
MAILBOX_PASSWORD_PATTERN:
  ${MAILBOX_PASSWORD_PATTERN:?MAILBOX_PASSWORD_PATTERN is required}
```

إجباريًا إذا كانت كلمات المرور الفردية الـ12 موجودة.

اجعل المنطق:

- per-agent override هو المصدر الأول.
- pattern مجرد fallback اختياري.

ويجب أن يتطابق Docker Compose مع منطق `server/agents.ts`.

---

# الثاني عشر — إصلاح Foundry UI

راجع:

`src/pages/FoundrySettings.tsx`

الوضع الحالي لا يختبر Foundry أو MCP فعلًا.

`fetch("/healthz")` ليس اختبار MCP.

يجب أن يكون اختبار الاتصال الحقيقي قادرًا على تنفيذ:

```text
MCP initialize / handshake
whoami
```

باستخدام Agent token صالح.

ولا تعرض:

```text
MCP connected
6 tools active
12 agents connected
```

إلا من بيانات حقيقية.

أزل كل Bearer Tokens التجريبية من:

`src/lib/chatStore.ts`

ممنوع وجود agent tokens داخل frontend source.

ممنوع تخزين Production bearer tokens افتراضيًا في `localStorage`.

إذا كانت UI تحتاج token setup، استخدم تدفقًا آمنًا لا يكشف جميع Tokens في المتصفح.

---

# الثالث عشر — إصلاح AgentChat

راجع:

`src/pages/AgentChat.tsx`

احذف:

```ts
setTimeout(...)
generateAgentResponse(...)
```

كآلية تشغيل Production.

لا تستخدم ردودًا ثابتة مثل:

```text
تم التأكد من سلامة القيود والمعاملات
تم تحديث الجدول الزمني
تم إصدار إشعار المعاملة
```

بدون تنفيذ حقيقي.

اربط الصفحة بBackend endpoint حقيقي يتعامل مع Agent runtime/Foundry.

يجب أن تكون الرسالة:

```text
UI
→ backend
→ selected Agent / Foundry runtime
→ response
→ persisted session
```

وليس frontend canned response.

الملفات المرفقة يجب:

- رفعها أو إرسالها فعليًا للbackend.
- عدم الاكتفاء بأول 1000 حرف.
- وجود size/type limits.
- عدم ادعاء أن Agent قرأ الملف إذا لم يحدث ذلك.

---

# الرابع عشر — إصلاح Dashboard

راجع:

`src/pages/Dashboard.tsx`

ممنوع استخدام:

```text
call_logs
```

لعرض:

```text
مكالمات ناجحة
مكالمات مقطوعة
Call completion rate
```

اعتمد على:

```text
call_sessions
call_events
```

واجعل المؤشرات الحقيقية مثل:

```text
Calls today
Answered
Failed
No answer
Average duration
Active calls
Agents online
Provider health
Recording availability
Transcription backlog
```

SMTP يمكن أن يظهر في قسم Mail مستقل فقط.

---

# الخامس عشر — إصلاح Clients / Accounts / UI naming

راجع كل صفحات:

`src/pages/*`

وخاصة:

```text
Clients.tsx
Accounts.tsx
Dashboard.tsx
FoundrySettings.tsx
AgentChat.tsx
```

هناك صفحات تحمل أسماء Routes لا تمثل محتواها.

يجب:

- `/clients` = عملاء حقيقيون.
- `/accounts` يحدد بالضبط هل المقصود Agents/Lines/Accounts.
- Call Center pages تستخدم Telephony terminology.
- Mail pages تستخدم Mail terminology.
- لا تخلط `Mailbox` مع `Phone Line`.
- لا تستخدم SMTP readiness كمؤشر Phone Line readiness.

---

# السادس عشر — Tests

الاختبارات الحالية تحت:

```text
src/tests/
```

قديمة وتعتمد Deno ومسارات غير موجودة.

لا تكتفِ باستبعادها من TypeScript.

إما:

- حذفها فقط إذا أثبت أنها legacy وغير مستخدمة، مع استبدالها باختبارات حقيقية.
- أو نقلها وتصحيحها.

أضف test runner فعلي للمشروع، و`package.json` scripts واضحة:

```json
"test": "...",
"test:unit": "...",
"test:integration": "..."
```

اختبر على الأقل:

1. Agent token validation.
2. RBAC.
3. capability authorization.
4. MCP whoami.
5. Telephony provider adapter.
6. fake/not-configured provider behavior.
7. Call session lifecycle.
8. webhook deduplication.
9. Daftra read operations.
10. Daftra write error handling.
11. ambiguous entity resolution.
12. admin API permissions.
13. token rotation failure recovery.
14. readiness.
15. canonical `/call` route.

---

# السابع عشر — CI

أضف GitHub Actions workflow مناسب.

الـPR/Push gate يجب أن يشغل:

```bash
npm ci
npm run typecheck
npm test
npm run validate:templates
npm run build
```

وإذا أمكن:

```bash
docker build .
```

يجب ألا يُدمج Production code إذا فشل أي منها.

---

# الثامن عشر — تحسين token rotation

راجع:

`server/tokenStore.ts`

عملية rotation الحالية يمكن أن تكتب clear token ثم يفشل Supabase hash update.

اجعل العملية أكثر Atomic أو نفذ rollback للملف/in-memory state عند فشل تحديث Supabase.

لا تترك:

```text
local token != Supabase hash
```

بعد API failure.

---

# التاسع عشر — Diagnostics

راجع:

`GET /api/diagnostics`

لا تجعل `viewer` قادرًا على تشغيل 12 SMTP AUTH probes بمجرد GET.

افصل:

```text
GET /api/diagnostics
```

للقراءة الخفيفة.

و:

```text
POST /api/diagnostics/smtp
POST /api/diagnostics/telephony
POST /api/diagnostics/daftra
```

للـoperator/admin مع rate limiting مناسب.

---

# العشرون — Rate limiting والأمان

أضف rate limiting مناسب على:

```text
/admin/
/api/auth
/call
token rotation
diagnostics
financial write tools
```

ولا تعتمد على Basic Auth وحده لمقاومة brute force.

احتفظ بالـsecurity headers الحالية.

راجع كذلك:

- CSP.
- request body limits.
- webhook signature verification.
- SSRF risks.
- logging of credentials.
- exception leakage.

---

# الواحد والعشرون — Readiness وHealth

`/healthz`:

يكون lightweight process health فقط.

`/readyz`:

يجب أن يعكس dependencies الحقيقية، وليس فقط Mail readiness.

أضف حالات مثل:

```json
{
  "database": true,
  "tokenStore": true,
  "telephonyProvider": true,
  "daftra": true,
  "templates": true
}
```

لكن لا تجعل Daftra أو SMTP dependency تمنع Call Gateway من الإقلاع إذا كانت تلك integration اختيارية؛ استخدم critical/optional dependency classification.

---

# الثاني والعشرون — لا تغيّر ما يعمل بلا سبب

الأجزاء الحالية الجيدة التي يجب الحفاظ عليها وتحسينها فقط:

- `timingSafeEqual`.
- SHA-256 token hashes.
- random 32-byte bearer tokens.
- token file mode `0600`.
- read-only runtime filesystem.
- tmpfs `/tmp`.
- dropped Linux capabilities.
- `no-new-privileges`.
- localhost-only container binding.
- Supabase server-side auth validation.
- RBAC architecture.
- Nginx TLS and security headers.

---

# المطلوب عند الانتهاء

لا أريد شرحًا عامًا.

أريد تنفيذ التعديلات داخل المستودع ثم تقرير نهائي يحتوي على:

## 1. Changed files

قائمة بكل ملف تم تعديله أو إنشاؤه أو حذفه ولماذا.

## 2. Critical fixes

أثبت تحديدًا أن:

```text
make_call != SMTP
get_call_transcript != static response
Daftra != mock
/call reachable through Nginx
Docker service names consistent
Deployment paths consistent
Frontend contains no hard-coded agent tokens
AgentChat no longer uses canned fake responses
Dashboard call metrics come from call tables
```

## 3. Database

اعرض migrations الجديدة والجداول والسياسات.

## 4. MCP tools

اعرض القائمة النهائية للأدوات مع capability المطلوبة لكل أداة.

## 5. Tests

شغّل فعليًا:

```bash
node --version
npm --version
npm ci
npm run typecheck
npm test
npm run validate:templates
npm run build
```

وأعطني المخرجات الحقيقية.

## 6. Docker

شغّل:

```bash
docker compose config
docker build .
```

أو:

```bash
docker compose build
```

إن كانت Docker متاحة.

لا تقل `Docker build passed` إذا لم يتم تشغيلها.

## 7. Static fake-data scan

ابحث في Production code عن:

```text
Math.random
mock
fake
demo
placeholder
setTimeout
durationSeconds: 45
INV-2026-884
PAY-
stockQuantity: 999
client@alazab.com
az_tok_
```

وافحص أي نتيجة يدويًا.

وجود `Math.random()` لأغراض UI IDs غير التشغيلية يمكن قبوله فقط إذا تم توضيحه، لكن ممنوع في External IDs أو business transaction IDs.

## 8. Legacy Mail scan

نفذ scan على:

```text
az-agent-call
agent-call
/mail
mail_
SMTP
Migadu
```

وصنف كل نتيجة إلى:

```text
intentional mail subsystem
legacy/error
```

ولا تترك Legacy reference بلا تفسير.

## 9. Git diff

اعرض:

```bash
git status --short
git diff --stat
```

ثم لخص أهم التغييرات.

## 10. Final production verdict

لا تستخدم كلمة:

```text
Production Ready
```

إلا إذا نجحت الـgates المطلوبة فعليًا.

إذا كان Provider الاتصال الحقيقي غير متوفر أو credentials غير متاحة، يجب أن يكون الحكم:

```text
Application architecture repaired.
Telephony production activation blocked by provider configuration.
```

وليس إنشاء fake provider لتجاوز الاختبار.

الهدف النهائي هو أن يصبح هذا المستودع **Az Agent Call حقيقيًا وقابلًا للصيانة والإنتاج**، وليس واجهة تبدو مكتملة بينما العمليات الأساسية محاكاة.
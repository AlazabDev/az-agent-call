#!/usr/bin/env bash
# ==============================================================================
# Az Agent Call - Environment Verification Script
# يتحقق من جميع مكونات البيئة ويقدم تقريراً مفصلاً
# ==============================================================================
set -euo pipefail

# ==============================================================================
# الألوان والإعدادات
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ==============================================================================
# المتغيرات العامة
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERIFICATION_REPORT="${PROJECT_ROOT}/verification-report.txt"
FAILED_CHECKS=0
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0
START_TIME=$(date +%s)

# ==============================================================================
# دوال مساعدة
# ==============================================================================
print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  🔍 $1${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "  ${GREEN}✅ $1${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

print_error() {
    echo -e "  ${RED}❌ $1${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

print_warning() {
    echo -e "  ${YELLOW}⚠️  $1${NC}"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
}

print_info() {
    echo -e "  ${CYAN}ℹ️  $1${NC}"
}

print_bold() {
    echo -e "  ${BOLD}$1${NC}"
}

print_result() {
    local status=$1
    local message=$2
    if [ "$status" -eq 0 ]; then
        print_success "$message"
    else
        print_error "$message"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    return $status
}

log_to_file() {
    echo "$1" >> "$VERIFICATION_REPORT"
}

section_separator() {
    echo -e "${BLUE}───────────────────────────────────────────────────────────────────────${NC}"
}

# ==============================================================================
# 1. التحقق من النظام الأساسي
# ==============================================================================
check_system() {
    print_header "1. التحقق من النظام الأساسي"
    
    # نظام التشغيل
    OS=$(uname -s)
    ARCH=$(uname -m)
    print_info "نظام التشغيل: $OS ($ARCH)"
    log_to_file "OS: $OS ($ARCH)"
    
    # إصدار النظام
    if [ -f /etc/os-release ]; then
        source /etc/os-release
        print_info "التوزيعة: $NAME $VERSION_ID"
        log_to_file "Distribution: $NAME $VERSION_ID"
    fi
    
    # المستخدم الحالي
    CURRENT_USER=$(whoami)
    print_info "المستخدم الحالي: $CURRENT_USER"
    log_to_file "User: $CURRENT_USER"
    
    # الصلاحيات
    if [ -w "$PROJECT_ROOT" ]; then
        print_success "صلاحيات الكتابة في مجلد المشروع"
    else
        print_error "لا توجد صلاحيات كتابة في مجلد المشروع"
    fi
    
    # المساحة المتوفرة
    AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
    print_info "المساحة المتوفرة: $AVAILABLE_SPACE"
    log_to_file "Available space: $AVAILABLE_SPACE"
    
    # الذاكرة
    if [[ "$OS" == "Linux" ]]; then
        TOTAL_RAM=$(free -h | awk '/^Mem:/ {print $2}')
        AVAILABLE_RAM=$(free -h | awk '/^Mem:/ {print $7}')
        print_info "الذاكرة: $AVAILABLE_RAM متوفرة من $TOTAL_RAM"
        log_to_file "RAM: $AVAILABLE_RAM available of $TOTAL_RAM"
    fi
    
    section_separator
}

# ==============================================================================
# 2. التحقق من تثبيت الأدوات
# ==============================================================================
check_tools() {
    print_header "2. التحقق من الأدوات المثبتة"
    
    # Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
        log_to_file "Node.js: $NODE_VERSION"
        
        # التحقق من الإصدار
        NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 20 ]; then
            print_success "  إصدار Node.js متوافق (>= v20)"
        else
            print_warning "  إصدار Node.js قديم (يوصى بـ v20+)"
        fi
    else
        print_error "Node.js غير مثبت"
        log_to_file "Node.js: NOT INSTALLED"
    fi
    
    # pnpm
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm: v$PNPM_VERSION"
        log_to_file "pnpm: v$PNPM_VERSION"
    else
        print_error "pnpm غير مثبت"
        log_to_file "pnpm: NOT INSTALLED"
    fi
    
    # TypeScript
    if command -v tsc &> /dev/null; then
        TS_VERSION=$(tsc --version)
        print_success "TypeScript: $TS_VERSION"
        log_to_file "TypeScript: $TS_VERSION"
    else
        print_warning "TypeScript غير مثبت عالمياً (سيتم استخدام المحلي)"
    fi
    
    # Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        print_success "Git: v$GIT_VERSION"
        log_to_file "Git: v$GIT_VERSION"
        
        # التحقق من حالة Git
        if [ -d "$PROJECT_ROOT/.git" ]; then
            BRANCH=$(git branch --show-current)
            COMMIT=$(git rev-parse --short HEAD)
            print_info "  الفرع الحالي: $BRANCH ($COMMIT)"
            log_to_file "  Branch: $BRANCH ($COMMIT)"
            
            # التحقق من التغييرات غير الملتزمة
            if [ -n "$(git status --porcelain)" ]; then
                print_warning "  توجد تغييرات غير ملتزمة في Git"
            else
                print_success "  لا توجد تغييرات غير ملتزمة"
            fi
        else
            print_warning "  المشروع ليس مستودع Git"
        fi
    else
        print_warning "Git غير مثبت"
    fi
    
    # Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | sed 's/,//')
        print_success "Docker: v$DOCKER_VERSION"
        log_to_file "Docker: v$DOCKER_VERSION"
        
        # التحقق من تشغيل Docker
        if docker info &> /dev/null; then
            print_success "  خدمة Docker قيد التشغيل"
        else
            print_warning "  Docker مثبت لكن الخدمة لا تعمل"
        fi
    else
        print_warning "Docker غير مثبت"
    fi
    
    # docker-compose
    if command -v docker-compose &> /dev/null; then
        DC_VERSION=$(docker-compose --version | cut -d' ' -f3 | sed 's/,//')
        print_success "docker-compose: v$DC_VERSION"
        log_to_file "docker-compose: v$DC_VERSION"
    fi
    
    section_separator
}

# ==============================================================================
# 3. التحقق من اعتماديات المشروع
# ==============================================================================
check_dependencies() {
    print_header "3. التحقق من اعتماديات المشروع"
    
    cd "$PROJECT_ROOT"
    
    # التحقق من وجود package.json
    if [ -f "package.json" ]; then
        print_success "ملف package.json موجود"
        
        # عدد الاعتماديات
        DEPS_COUNT=$(jq '.dependencies | length' package.json 2>/dev/null || echo "0")
        DEV_DEPS_COUNT=$(jq '.devDependencies | length' package.json 2>/dev/null || echo "0")
        print_info "  الاعتماديات: $DEPS_COUNT | تطويرية: $DEV_DEPS_COUNT"
        log_to_file "  Dependencies: $DEPS_COUNT | DevDependencies: $DEV_DEPS_COUNT"
    else
        print_error "ملف package.json غير موجود"
        return 1
    fi
    
    # التحقق من وجود node_modules
    if [ -d "node_modules" ]; then
        NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "?")
        print_success "مجلد node_modules موجود ($NODE_MODULES_SIZE)"
        log_to_file "  node_modules: $NODE_MODULES_SIZE"
        
        # عدد الحزم المثبتة
        if command -v pnpm &> /dev/null; then
            PACKAGES_COUNT=$(pnpm list --depth=0 2>/dev/null | grep -c "^├──" || echo "0")
            print_info "  عدد الحزم المثبتة: ~$PACKAGES_COUNT"
        fi
    else
        print_warning "مجلد node_modules غير موجود (تشغيل: pnpm install)"
    fi
    
    # التحقق من وجود pnpm-lock.yaml
    if [ -f "pnpm-lock.yaml" ]; then
        print_success "ملف pnpm-lock.yaml موجود"
    else
        print_warning "ملف pnpm-lock.yaml غير موجود"
    fi
    
    section_separator
}

# ==============================================================================
# 4. التحقق من متغيرات البيئة
# ==============================================================================
check_environment_variables() {
    print_header "4. التحقق من متغيرات البيئة"
    
    cd "$PROJECT_ROOT"
    
    # التحقق من وجود ملف .env
    if [ -f ".env" ]; then
        print_success "ملف .env موجود"
        
        # المتغيرات المطلوبة
        REQUIRED_VARS=(
            "AZURE_SUBSCRIPTION_ID"
            "AZURE_AI_ENDPOINT"
            "AGENT_NAME"
            "AGENT_VERSION"
            "NODE_ENV"
        )
        
        # قراءة المتغيرات من ملف .env
        source .env 2>/dev/null || true
        
        for var in "${REQUIRED_VARS[@]}"; do
            if [ -n "${!var:-}" ]; then
                # إخفاء القيم الحساسة
                if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
                    print_success "  $var = [مخفى] ✓"
                else
                    print_success "  $var = ${!var} ✓"
                fi
                log_to_file "  $var = ${!var}"
            else
                print_warning "  $var غير معرف"
                log_to_file "  $var = NOT SET"
            fi
        done
        
        # التحقق من متغيرات Azure الإضافية
        if [ -n "${AZURE_CLIENT_ID:-}" ]; then
            print_success "  AZURE_CLIENT_ID = [مخفى] ✓"
        fi
        if [ -n "${AZURE_TENANT_ID:-}" ]; then
            print_success "  AZURE_TENANT_ID = [مخفى] ✓"
        fi
        
    else
        print_warning "ملف .env غير موجود"
        print_info "  يمكن إنشاؤه من .env.example"
        
        if [ -f ".env.example" ]; then
            print_success "  ملف .env.example موجود"
        else
            print_warning "  ملف .env.example غير موجود"
        fi
    fi
    
    section_separator
}

# ==============================================================================
# 5. التحقق من ملفات التكوين
# ==============================================================================
check_config_files() {
    print_header "5. التحقق من ملفات التكوين"
    
    cd "$PROJECT_ROOT"
    
    # التحقق من tsconfig.json
    if [ -f "tsconfig.json" ]; then
        print_success "tsconfig.json موجود"
        if command -v jq &> /dev/null; then
            TS_TARGET=$(jq -r '.compilerOptions.target // "unknown"' tsconfig.json)
            TS_MODULE=$(jq -r '.compilerOptions.module // "unknown"' tsconfig.json)
            print_info "  target: $TS_TARGET | module: $TS_MODULE"
        fi
    else
        print_error "tsconfig.json غير موجود"
    fi
    
    # التحقق من tsconfig.app.json
    if [ -f "tsconfig.app.json" ]; then
        print_success "tsconfig.app.json موجود"
    else
        print_warning "tsconfig.app.json غير موجود"
    fi
    
    # التحقق من tsconfig.server.json
    if [ -f "tsconfig.server.json" ]; then
        print_success "tsconfig.server.json موجود"
    else
        print_warning "tsconfig.server.json غير موجود"
    fi
    
    # التحقق من vite.config.ts
    if [ -f "vite.config.ts" ]; then
        print_success "vite.config.ts موجود"
    else
        print_warning "vite.config.ts غير موجود"
    fi
    
    # التحقق من biome.json
    if [ -f "biome.json" ]; then
        print_success "biome.json موجود"
    else
        print_warning "biome.json غير موجود"
    fi
    
    section_separator
}

# ==============================================================================
# 6. التحقق من بنية المشروع
# ==============================================================================
check_project_structure() {
    print_header "6. التحقق من بنية المشروع"
    
    cd "$PROJECT_ROOT"
    
    # المجلدات الأساسية
    DIRS=("src" "server" "shared" "scripts" "dist")
    
    for dir in "${DIRS[@]}"; do
        if [ -d "$dir" ]; then
            print_success "مجلد $dir موجود"
        else
            print_warning "مجلد $dir غير موجود"
        fi
    done
    
    # المجلدات الفرعية في src
    if [ -d "src" ]; then
        SUB_DIRS=("agents" "core" "components")
        for dir in "${SUB_DIRS[@]}"; do
            if [ -d "src/$dir" ]; then
                print_success "  src/$dir موجود"
            else
                print_warning "  src/$dir غير موجود"
            fi
        done
    fi
    
    # المجلدات الفرعية في server
    if [ -d "server" ]; then
        SUB_DIRS=("routes" "middleware")
        for dir in "${SUB_DIRS[@]}"; do
            if [ -d "server/$dir" ]; then
                print_success "  server/$dir موجود"
            else
                print_warning "  server/$dir غير موجود"
            fi
        done
    fi
    
    # ملفات رئيسية
    FILES=("index.html" "package.json" "README.md")
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            print_success "ملف $file موجود"
        else
            print_warning "ملف $file غير موجود"
        fi
    done
    
    section_separator
}

# ==============================================================================
# 7. التحقق من الاتصال بالخدمات
# ==============================================================================
check_services() {
    print_header "7. التحقق من الاتصال بالخدمات"
    
    cd "$PROJECT_ROOT"
    
    # التحقق من اتصال Azure
    print_info "📡 التحقق من اتصال Azure..."
    if command -v az &> /dev/null; then
        if az account show &> /dev/null; then
            AZURE_ACCOUNT=$(az account show --query name -o tsv 2>/dev/null)
            AZURE_SUB=$(az account show --query id -o tsv 2>/dev/null)
            print_success "  اتصال Azure ناجح: $AZURE_ACCOUNT"
            log_to_file "  Azure: $AZURE_ACCOUNT ($AZURE_SUB)"
        else
            print_warning "  لم يتم تسجيل الدخول إلى Azure (تشغيل: az login)"
            log_to_file "  Azure: Not logged in"
        fi
    else
        print_warning "  Azure CLI غير مثبت"
    fi
    
    # التحقق من اتصال Docker
    print_info "🐳 التحقق من اتصال Docker..."
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            CONTAINERS=$(docker ps -q | wc -l)
            print_success "  اتصال Docker ناجح (عدد الحاويات: $CONTAINERS)"
            log_to_file "  Docker: Connected ($CONTAINERS containers)"
        else
            print_warning "  خدمة Docker لا تعمل"
        fi
    fi
    
    # التحقق من المنافذ المستخدمة
    print_info "🔌 التحقق من المنافذ..."
    PORTS=(3000 3300 3400 8080)
    for port in "${PORTS[@]}"; do
        if lsof -i :$port &> /dev/null || netstat -tuln 2>/dev/null | grep -q ":$port "; then
            print_warning "  المنفذ $port قيد الاستخدام"
            log_to_file "  Port $port: In use"
        else
            print_success "  المنفذ $port متاح"
        fi
    done
    
    section_separator
}

# ==============================================================================
# 8. التحقق من وكيل Codex
# ==============================================================================
check_codex_agent() {
    print_header "8. التحقق من وكيل Codex"
    
    cd "$PROJECT_ROOT"
    
    # التحقق من وجود ملفات الوكيل
    if [ -d "src/agents/codex" ]; then
        print_success "مجلد الوكيل موجود"
        
        # ملفات الوكيل
        AGENT_FILES=("index.ts" "types.ts" "config.ts")
        for file in "${AGENT_FILES[@]}"; do
            if [ -f "src/agents/codex/$file" ]; then
                print_success "  src/agents/codex/$file موجود"
            else
                print_warning "  src/agents/codex/$file غير موجود"
            fi
        done
        
        # التحقق من مجلد الأدوات
        if [ -d "src/agents/codex/tools" ]; then
            TOOLS_COUNT=$(find src/agents/codex/tools -name "*.ts" | wc -l)
            print_success "  مجلد الأدوات موجود ($TOOLS_COUNT ملف)"
            log_to_file "  Tools: $TOOLS_COUNT files"
        else
            print_warning "  مجلد الأدوات غير موجود"
        fi
    else
        print_error "مجلد الوكيل غير موجود"
    fi
    
    # التحقق من تكامل Azure
    if [ -f "src/core/azure-client.ts" ]; then
        print_success "ملف عميل Azure موجود"
    else
        print_warning "ملف عميل Azure غير موجود"
    fi
    
    # محاولة اختبار الوكيل إذا كان يعمل
    print_info "🔄 محاولة اختبار الوكيل..."
    if command -v curl &> /dev/null; then
        # محاولة الاتصال بـ health endpoint
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3300/healthz 2>/dev/null | grep -q "200"; then
            print_success "  الوكيل يعمل (تم الوصول إلى /healthz)"
        else
            print_warning "  الوكيل لا يستجيب (قد لا يكون قيد التشغيل)"
        fi
    fi
    
    section_separator
}

# ==============================================================================
# 9. التحقق من الأمان
# ==============================================================================
check_security() {
    print_header "9. التحقق من الأمان"
    
    cd "$PROJECT_ROOT"
    
    # التحقق من ملفات .env في git
    if [ -f ".env" ] && [ -f ".gitignore" ]; then
        if grep -q "\.env" .gitignore 2>/dev/null; then
            print_success ".env مدرج في .gitignore"
        else
            print_warning ".env غير مدرج في .gitignore (خطر أمني!)"
        fi
    fi
    
    # التحقق من صلاحيات الملفات
    if [ -f ".env" ]; then
        PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%Lp" .env 2>/dev/null)
        if [ "$PERMS" -le 600 ]; then
            print_success "صلاحيات .env آمنة ($PERMS)"
        else
            print_warning "صلاحيات .env غير آمنة ($PERMS - يوصى بـ 600)"
        fi
    fi
    
    # التحقق من وجود ملفات حساسة
    SENSITIVE_FILES=("*.pem" "*.key" "*.crt" "*.p12")
    for pattern in "${SENSITIVE_FILES[@]}"; do
        if find . -name "$pattern" -not -path "./node_modules/*" 2>/dev/null | grep -q .; then
            print_warning "  ملفات حساسة موجودة ($pattern)"
        fi
    done
    
    # التحقق من المتغيرات الحساسة في package.json
    if [ -f "package.json" ]; then
        if grep -i "secret\|key\|password\|token" package.json 2>/dev/null | grep -v "devDependencies" | grep -v "dependencies"; then
            print_warning "  توجد كلمات حساسة في package.json"
        fi
    fi
    
    section_separator
}

# ==============================================================================
# 10. التحقق من الأداء
# ==============================================================================
check_performance() {
    print_header "10. التحقق من الأداء"
    
    cd "$PROJECT_ROOT"
    
    # حجم المشروع
    PROJECT_SIZE=$(du -sh . 2>/dev/null | cut -f1)
    print_info "حجم المشروع: $PROJECT_SIZE"
    
    # عدد الملفات
    FILES_COUNT=$(find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" 2>/dev/null | wc -l)
    print_info "عدد الملفات: $FILES_COUNT"
    
    # حجم node_modules
    if [ -d "node_modules" ]; then
        NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
        print_info "حجم node_modules: $NODE_MODULES_SIZE"
    fi
    
    # وقت البناء (تقديري)
    print_info "⏱️  وقت البناء التقديري: ~30-60 ثانية"
    
    section_separator
}

# ==============================================================================
# 11. إنشاء التقرير النهائي
# ==============================================================================
generate_report() {
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    print_header "📊 التقرير النهائي"
    
    echo -e "${BOLD}${CYAN}النتائج:${NC}"
    echo -e "  ${GREEN}✅ ناجح: $PASSED_CHECKS${NC}"
    echo -e "  ${YELLOW}⚠️  تحذيرات: $WARNING_CHECKS${NC}"
    echo -e "  ${RED}❌ فشل: $FAILED_CHECKS${NC}"
    echo -e "  ${BLUE}📝 المجموع: $TOTAL_CHECKS${NC}"
    echo ""
    echo -e "  ${CYAN}⏱️  الوقت المستغرق: ${DURATION} ثانية${NC}"
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
        echo -e "${GREEN}${BOLD}🎉 بيئة مثالية! كل شيء يعمل بشكل صحيح.${NC}"
    elif [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${YELLOW}${BOLD}⚠️  البيئة تعمل ولكن مع بعض التحذيرات.${NC}"
        echo -e "${YELLOW}يوصى بمعالجة التحذيرات لتحسين الأداء.${NC}"
    else
        echo -e "${RED}${BOLD}❌ توجد مشاكل في البيئة تحتاج إلى إصلاح.${NC}"
        echo -e "${RED}يرجى مراجعة الأخطاء أعلاه وإصلاحها.${NC}"
    fi
    
    echo ""
    section_separator
    
    # حفظ التقرير
    cat > "$VERIFICATION_REPORT" << EOF
═══════════════════════════════════════════════════════════════════════════════
  📊 تقرير التحقق من البيئة - Az Agent Call
═══════════════════════════════════════════════════════════════════════════════

التاريخ: $(date)
المدة: ${DURATION} ثانية

النتائج:
  ✅ ناجح: $PASSED_CHECKS
  ⚠️  تحذيرات: $WARNING_CHECKS
  ❌ فشل: $FAILED_CHECKS
  📝 المجموع: $TOTAL_CHECKS

═══════════════════════════════════════════════════════════════════════════════
EOF
    
    echo -e "${GREEN}✅ تم حفظ التقرير في: $VERIFICATION_REPORT${NC}"
}

# ==============================================================================
# الوظيفة الرئيسية
# ==============================================================================
main() {
    echo -e "${BOLD}${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║   🔍  Az Agent Call - Environmental Verification Script                      ║"
    echo "║                                                                               ║"
    echo "║   التحقق الشامل من بيئة مركز الاتصال                                         ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}📂 مجلد المشروع: $PROJECT_ROOT${NC}"
    echo -e "${CYAN}📄 تقرير النتائج: $VERIFICATION_REPORT${NC}"
    echo ""
    
    # تنفيذ جميع الفحوصات
    check_system
    check_tools
    check_dependencies
    check_environment_variables
    check_config_files
    check_project_structure
    check_services
    check_codex_agent
    check_security
    check_performance
    
    # التقرير النهائي
    generate_report
    
    # الخروج مع الكود المناسب
    if [ $FAILED_CHECKS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# ==============================================================================
# تشغيل السكربت
# ==============================================================================
main "$@"
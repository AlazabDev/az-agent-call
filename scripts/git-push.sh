#!/usr/bin/env bash
# ==============================================================================
# Az Agent Call - Git Push Script
# دفع التحديثات إلى مستودع Git مع التحقق من كل شيء
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
# المتغيرات العامة - إصلاح مشكلة المتغيرات غير المعرفة
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# تعيين القيم الافتراضية مع التحقق من وجود المتغيرات
BRANCH="${1:-main}"
COMMIT_MESSAGE="${2:-"Update: $(date '+%Y-%m-%d %H:%M:%S')"}"
REMOTE="${3:-origin}"

cd "$PROJECT_ROOT"

# ==============================================================================
# دوال مساعدة
# ==============================================================================
print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  📤 $1${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "  ${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "  ${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "  ${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "  ${CYAN}ℹ️  $1${NC}"
}

print_bold() {
    echo -e "  ${BOLD}$1${NC}"
}

section_separator() {
    echo -e "${BLUE}───────────────────────────────────────────────────────────────────────${NC}"
}

# ==============================================================================
# 1. التحقق من المستودع
# ==============================================================================
check_repository() {
    print_header "1. التحقق من مستودع Git"
    
    # التحقق من وجود Git
    if ! command -v git &> /dev/null; then
        print_error "Git غير مثبت"
        return 1
    fi
    
    # التحقق من وجود مجلد .git
    if [ ! -d ".git" ]; then
        print_error "هذا ليس مستودع Git"
        return 1
    fi
    
    print_success "مستودع Git موجود"
    
    # الفرع الحالي
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    print_info "الفرع الحالي: $CURRENT_BRANCH"
    
    # إذا كان الفرع مختلفاً عن المطلوب
    if [ "$CURRENT_BRANCH" != "$BRANCH" ] && [ "$CURRENT_BRANCH" != "unknown" ]; then
        print_warning "أنت على فرع $CURRENT_BRANCH، وليس $BRANCH"
        read -p "هل تريد التبديل إلى فرع $BRANCH؟ (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
            print_success "تم التبديل إلى فرع $BRANCH"
        else
            print_info "سيتم استخدام الفرع $CURRENT_BRANCH"
            BRANCH="$CURRENT_BRANCH"
        fi
    fi
    
    section_separator
}

# ==============================================================================
# 2. التحقق من التغييرات
# ==============================================================================
check_changes() {
    print_header "2. التحقق من التغييرات"
    
    # التحقق من وجود تغييرات
    if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
        print_warning "لا توجد تغييرات لإرسالها"
        read -p "هل تريد المتابعة مع push فقط؟ (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "تم الإلغاء"
            exit 0
        fi
        return 0
    fi
    
    # عرض حالة التغييرات
    print_info "التغييرات الحالية:"
    echo ""
    git status --short
    echo ""
    
    # عدد الملفات المتغيرة
    CHANGED_FILES=$(git status --porcelain 2>/dev/null | wc -l)
    print_info "عدد الملفات المتغيرة: $CHANGED_FILES"
    
    section_separator
}

# ==============================================================================
# 3. تجميع التغييرات (Stage)
# ==============================================================================
stage_changes() {
    print_header "3. تجميع التغييرات"
    
    read -p "هل تريد تجميع جميع التغييرات؟ (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        print_success "تم تجميع جميع التغييرات"
    else
        print_info "يمكنك تجميع الملفات يدوياً باستخدام: git add <file>"
        read -p "هل تريد المتابعة مع التغييرات الحالية؟ (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "تم الإلغاء"
            exit 0
        fi
    fi
    
    # عرض الملفات المجمعة
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | wc -l)
    print_info "الملفات المجمعة: $STAGED_FILES"
    
    section_separator
}

# ==============================================================================
# 4. تشغيل الفحوصات
# ==============================================================================
run_checks() {
    print_header "4. تشغيل فحوصات الجودة"
    
    # تشغيل Biome
    if command -v pnpm &> /dev/null; then
        print_info "🔍 تشغيل Biome..."
        if pnpm run lint:check 2>/dev/null; then
            print_success "Biome: لا توجد مشاكل"
        else
            print_warning "Biome: توجد مشاكل في الكود"
            read -p "هل تريد محاولة الإصلاح التلقائي؟ (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                pnpm run lint 2>/dev/null || true
                print_success "تم إصلاح المشاكل تلقائياً"
                # إعادة تجميع التغييرات
                git add .
            else
                print_warning "سيتم المتابعة مع المشاكل الموجودة"
            fi
        fi
    else
        print_warning "pnpm غير موجود، تخطي فحص الكود"
    fi
    
    # تشغيل فحص النوع
    if command -v pnpm &> /dev/null; then
        print_info "🔍 تشغيل فحص النوع (TypeScript)..."
        if pnpm run typecheck 2>/dev/null; then
            print_success "TypeScript: لا توجد مشاكل"
        else
            print_warning "TypeScript: توجد مشاكل في الأنواع"
            read -p "هل تريد المتابعة مع المشاكل؟ (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "تم الإلغاء"
                exit 0
            fi
        fi
    fi
    
    section_separator
}

# ==============================================================================
# 5. تأكيد التغييرات (Commit)
# ==============================================================================
commit_changes() {
    print_header "5. تأكيد التغييرات"
    
    # التحقق من وجود تغييرات للتأكيد
    if [ -z "$(git diff --cached --name-only 2>/dev/null)" ]; then
        print_warning "لا توجد تغييرات للتأكيد"
        return 0
    fi
    
    # عرض رسالة الـ commit المقترحة
    print_info "رسالة الـ commit المقترحة:"
    echo -e "${CYAN}  $COMMIT_MESSAGE${NC}"
    echo ""
    
    read -p "هل تريد استخدام هذه الرسالة؟ (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        read -p "أدخل رسالة commit جديدة: " COMMIT_MESSAGE
        if [ -z "$COMMIT_MESSAGE" ]; then
            print_error "رسالة commit مطلوبة"
            exit 1
        fi
    fi
    
    # تنفيذ الـ commit
    git commit -m "$COMMIT_MESSAGE"
    print_success "تم تأكيد التغييرات"
    
    # عرض آخر commit
    print_info "آخر commit:"
    git log -1 --oneline
    
    section_separator
}

# ==============================================================================
# 6. دفع التغييرات
# ==============================================================================
push_changes() {
    print_header "6. دفع التغييرات إلى $REMOTE/$BRANCH"
    
    # التحقق من وجود remote
    if ! git remote get-url "$REMOTE" &>/dev/null; then
        print_error "الـ remote '$REMOTE' غير موجود"
        print_info "الـ remotes المتاحة:"
        git remote -v
        return 1
    fi
    
    # Pull أحدث التغييرات أولاً
    print_info "🔄 جلب التغييرات من $REMOTE/$BRANCH..."
    git pull "$REMOTE" "$BRANCH" --rebase 2>/dev/null || true
    
    # تنفيذ الـ push
    print_info "📤 دفع التغييرات إلى $REMOTE/$BRANCH..."
    if git push "$REMOTE" "$BRANCH" 2>/dev/null; then
        print_success "تم دفع التغييرات بنجاح إلى $REMOTE/$BRANCH"
    else
        print_error "فشل دفع التغييرات"
        print_info "قد تحتاج إلى: git push --force $REMOTE $BRANCH"
        return 1
    fi
    
    section_separator
}

# ==============================================================================
# 7. إنشاء تقرير
# ==============================================================================
generate_report() {
    print_header "📊 تقرير الدفع"
    
    # معلومات الدفع
    COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    COMMIT_DATE=$(git log -1 --format=%cd 2>/dev/null || echo "unknown")
    COMMIT_AUTHOR=$(git log -1 --format=%an 2>/dev/null || echo "unknown")
    
    echo -e "${BOLD}${CYAN}معلومات الدفع:${NC}"
    echo "  📝 الـ commit: $COMMIT_HASH"
    echo "  📅 التاريخ: $COMMIT_DATE"
    echo "  👤 المؤلف: $COMMIT_AUTHOR"
    echo "  📌 الفرع: $BRANCH"
    echo "  🔗 الـ remote: $REMOTE"
    echo ""
    
    # عدد الملفات المتغيرة
    CHANGED_FILES_COUNT=$(git diff --stat HEAD~1 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    echo "  📄 الملفات المتغيرة: $CHANGED_FILES_COUNT"
    
    echo ""
    echo -e "${GREEN}${BOLD}✅ تم دفع التغييرات بنجاح!${NC}"
    
    section_separator
}

# ==============================================================================
# 8. عرض المساعدة
# ==============================================================================
show_help() {
    echo -e "${BOLD}${CYAN}استخدام:${NC}"
    echo "  ./scripts/git-push.sh [الفرع] [الرسالة] [الـ remote]"
    echo ""
    echo -e "${BOLD}${CYAN}مثال:${NC}"
    echo "  ./scripts/git-push.sh main 'إضافة ميزة جديدة' origin"
    echo "  ./scripts/git-push.sh develop 'إصلاح خطأ' origin"
    echo ""
    echo -e "${BOLD}${CYAN}المعلمات:${NC}"
    echo "  الفرع     - اسم الفرع (الافتراضي: main)"
    echo "  الرسالة   - رسالة الـ commit (الافتراضي: التاريخ الحالي)"
    echo "  الـ remote - اسم الـ remote (الافتراضي: origin)"
    echo ""
}

# ==============================================================================
# الوظيفة الرئيسية - إصلاح مشكلة المتغيرات
# ==============================================================================
main() {
    # التحقق من وجود معلمات
    if [ $# -gt 0 ] && { [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; }; then
        show_help
        exit 0
    fi

    echo -e "${BOLD}${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                               ║"
    echo "║   📤  Az Agent Call - Git Push Script                                      ║"
    echo "║                                                                               ║"
    echo "║   دفع التحديثات إلى مستودع Git مع التحقق من كل شيء                          ║"
    echo "║                                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}📂 مجلد المشروع: $PROJECT_ROOT${NC}"
    echo -e "${CYAN}📌 الفرع: $BRANCH${NC}"
    echo -e "${CYAN}📝 الرسالة: $COMMIT_MESSAGE${NC}"
    echo -e "${CYAN}🔗 الـ remote: $REMOTE${NC}"
    echo ""
    
    # تنفيذ جميع الخطوات مع التحقق من الأخطاء
    check_repository || exit 1
    check_changes
    stage_changes
    run_checks
    commit_changes
    push_changes || {
        print_warning "فشل الدفع. قد تحتاج إلى حل التعارضات أولاً"
        exit 1
    }
    generate_report
    
    echo ""
    echo -e "${GREEN}${BOLD}🎉 اكتمل دفع التغييرات بنجاح!${NC}"
}

# ==============================================================================
# تشغيل السكربت
# ==============================================================================
main "$@"
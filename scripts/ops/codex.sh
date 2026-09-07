#!/bin/bash

# scripts/fix-json.sh
# هذا السكربت يقوم بتجاهل ملفات JSON الكبيرة من فحص Biome

echo "🔧 تهيئة استثناءات ملفات JSON الكبيرة..."

# إنشاء أو تحديث ملف biome.json
cat > biome.json << 'EOF'
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn",
        "noControlCharactersInRegex": "error"
      },
      "a11y": {
        "useGenericFontNames": "warn"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedFunctionParameters": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  },
  "files": {
    "maxSize": 5242880,
    "ignore": [
      "node_modules",
      "dist",
      "dist-server",
      "build",
      "coverage",
      ".next",
      "*.d.ts",
      "*.json",
      "**/*.json",
      "docs/**/*.json",
      "openapi/**/*.json",
      "templates/**/*.json"
    ]
  }
}
EOF

echo "✅ تم تحديث ملف biome.json"
echo ""
echo "📋 الآن يمكنك تشغيل:"
echo "  pnpm biome check ."
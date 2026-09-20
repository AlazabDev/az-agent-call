const fs = require('fs');
const path = require('path');

const envExamplePath = path.join(__dirname, 'env.example');
const envProductionPath = path.join(__dirname, 'env.production');

function parseEnv(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const vars = {};
    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([a-zA-Z_0-9]+)=(.*)$/);
            if (match) {
                let key = match[1];
                let value = match[2];
                // Remove inline comments
                if (value.includes(' # ')) {
                    value = value.split(' # ')[0];
                }
                vars[key] = value.trim();
            }
        }
    }
    return vars;
}

if (!fs.existsSync(envExamplePath)) {
    console.log(`Missing ${envExamplePath}`);
    process.exit(1);
}

if (!fs.existsSync(envProductionPath)) {
    console.log(`Missing ${envProductionPath}`);
    process.exit(1);
}

const exampleVars = parseEnv(envExamplePath);
const prodVars = parseEnv(envProductionPath);

const exampleKeys = Object.keys(exampleVars);
const prodKeys = Object.keys(prodVars);

const onlyInExample = exampleKeys.filter(k => !prodKeys.includes(k));
const onlyInProd = prodKeys.filter(k => !exampleKeys.includes(k));
const diffValues = [];

for (const key of exampleKeys) {
    if (prodKeys.includes(key)) {
        if (exampleVars[key] !== prodVars[key]) {
            diffValues.push({
                key,
                exampleVal: exampleVars[key],
                prodVal: prodVars[key]
            });
        }
    }
}

console.log('--- مقارنة بين env.example و env.production ---');
console.log('\n1. المتغيرات الموجودة في env.example فقط:');
if (onlyInExample.length) {
    onlyInExample.forEach(k => console.log(`  - ${k}`));
} else {
    console.log('  لا يوجد.');
}

console.log('\n2. المتغيرات الموجودة في env.production فقط:');
if (onlyInProd.length) {
    onlyInProd.forEach(k => console.log(`  - ${k}`));
} else {
    console.log('  لا يوجد.');
}

console.log('\n3. المتغيرات الموجودة في كلا الملفين ولكن بقيم مختلفة:');
if (diffValues.length) {
    diffValues.forEach(diff => {
        console.log(`  - ${diff.key}:`);
        console.log(`      env.example:   ${diff.exampleVal}`);
        console.log(`      env.production:${diff.prodVal}`);
    });
} else {
    console.log('  لا يوجد أي اختلاف في القيم المشتركة.');
}

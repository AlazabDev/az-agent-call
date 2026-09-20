const fs = require('fs');
const path = require('path');

const prodPath = path.join(__dirname, 'env.production');
let prodContent = fs.readFileSync(prodPath, 'utf8');

const valuesToInject = {
    'CREDS_KEY': 'fa3133ab3117e63d2e31b3d95c81a5ba19a08de7030b17c2182b1353c432fe64',
    'CREDS_IV': 'af26506d6bc7e57dfb2e502e9437998d',
    'JWT_SECRET': '83a9ee2f822163a161ea06f8b94dd31e2ae5a2327a8ec40fdfe799cf38b6641d',
    'JWT_REFRESH_SECRET': '1da96654269d1c6c9d807c803a44edd9264323ec84491a4f82a2252c2dff33c7'
};

const lines = prodContent.split('\n');
const newLines = lines.map(line => {
    const match = line.match(/^([a-zA-Z_0-9]+)=/);
    if (match) {
        const key = match[1];
        if (valuesToInject[key]) {
            return `${key}=${valuesToInject[key]}`;
        }
    }
    return line;
});

fs.writeFileSync(prodPath, newLines.join('\n'));
console.log('Successfully updated env.production with secure keys.');

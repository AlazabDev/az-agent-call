const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, 'env.example');
let envContent = fs.readFileSync(envPath, 'utf8');

const necessaryVars = {
    'CREDS_KEY': crypto.randomBytes(32).toString('hex'),
    'CREDS_IV': crypto.randomBytes(16).toString('hex'),
    'JWT_SECRET': crypto.randomBytes(32).toString('hex'),
    'JWT_REFRESH_SECRET': crypto.randomBytes(32).toString('hex'),
};

const unnecessaryVars = [
    'PROXY', 'AZURE_AI_SEARCH_SERVICE_ENDPOINT', 'AZURE_AI_SEARCH_INDEX_NAME', 'AZURE_AI_SEARCH_API_KEY',
    'AZURE_AI_SEARCH_API_VERSION', 'AZURE_AI_SEARCH_SEARCH_OPTION_QUERY_TYPE', 'AZURE_AI_SEARCH_SEARCH_OPTION_TOP',
    'AZURE_AI_SEARCH_SEARCH_OPTION_SELECT', 'GOOGLE_SEARCH_API_KEY', 'GOOGLE_CSE_ID', 'TAVILY_API_KEY',
    'TRAVERSAAL_API_KEY', 'WOLFRAM_APP_ID', 'ZAPIER_NLA_API_KEY', 'MEILI_MASTER_KEY', 'STT_API_KEY',
    'TTS_API_KEY', 'OPENAI_MODERATION_API_KEY', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET',
    'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
    'APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY_PATH', 'OPENID_REQUIRED_ROLE',
    'OPENID_REQUIRED_ROLE_TOKEN_KIND', 'OPENID_REQUIRED_ROLE_PARAMETER_PATH', 'OPENID_ADMIN_ROLE_PARAMETER_PATH',
    'OPENID_ADMIN_ROLE_TOKEN_KIND', 'OPENID_ROLE_SYNC_CLAIM', 'OPENID_ROLE_SYNC_ROLE_PRIORITY',
    'OPENID_ROLE_SYNC_FALLBACK_ROLE', 'OPENID_USERNAME_CLAIM', 'OPENID_NAME_CLAIM', 'OPENID_EMAIL_CLAIM',
    'OPENID_AUDIENCE', 'OPENID_REFRESH_AUDIENCE', 'OPENID_BUTTON_LABEL', 'OPENID_IMAGE_URL',
    'OPENID_REUSE_TOKENS', 'OPENID_REUSE_MAX_SESSION_AGE_MS', 'OPENID_REFRESH_BRIDGE_GRACE_MS',
    'OPENID_JWKS_URL_CACHE_ENABLED', 'OPENID_ON_BEHALF_FLOW_FOR_USERINFO_REQUIRED', 'OPENID_USE_END_SESSION_ENDPOINT',
    'OPENID_POST_LOGOUT_REDIRECT_URI', 'OPENID_MAX_LOGOUT_URL_LENGTH', 'SAML_ENTRY_POINT', 'SAML_ISSUER',
    'SAML_CERT', 'SAML_SESSION_SECRET', 'SAML_IDP_ISSUER', 'SAML_EMAIL_CLAIM', 'SAML_USERNAME_CLAIM',
    'SAML_GIVEN_NAME_CLAIM', 'SAML_FAMILY_NAME_CLAIM', 'SAML_PICTURE_CLAIM', 'SAML_NAME_CLAIM',
    'SAML_BUTTON_LABEL', 'SAML_IMAGE_URL', 'LDAP_URL', 'LDAP_BIND_DN', 'LDAP_BIND_CREDENTIALS',
    'LDAP_USER_SEARCH_BASE', 'LDAP_CA_CERT_PATH', 'OPENWEATHER_API_KEY'
];

const lines = envContent.split('\n');
const newLines = lines.map(line => {
    // Check if the line sets a variable
    const match = line.match(/^([a-zA-Z_0-9]+)=/);
    if (match) {
        const key = match[1];
        if (necessaryVars[key]) {
            return `${key}=${necessaryVars[key]}`;
        }
        if (unnecessaryVars.includes(key) && line.trim() === `${key}=`) {
            // Optional: fill unnecessary vars with something or leave them empty.
            // Leaving them empty is usually best for `.env` so services don't think they are enabled.
            // I'll add a comment indicating it's unused.
            return `${line} # [NOT_REQUIRED_FOR_CURRENT_DEPLOYMENT]`;
        }
    }
    return line;
});

fs.writeFileSync(envPath, newLines.join('\n'));
console.log('Successfully filled necessary secure variables and marked unnecessary variables.');


import fs from 'fs';
import path from 'path';

const dirsToSkip = ['node_modules', 'dist', 'dist-server', '.git', 'openapi', 'public'];
const extensions = ['.ts', '.tsx', '.sql', '.md', '.toml', '.json', '.sh'];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (dirsToSkip.includes(file)) return;
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filepath));
        } else {
            if (extensions.some(ext => file.endsWith(ext))) {
                results.push(filepath);
            }
        }
    });
    return results;
}

const files = walk('.');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    content = content.replace(/mail_agents/g, 'call_agents');
    content = content.replace(/mail_templates/g, 'call_templates');
    content = content.replace(/mail_send_log/g, 'call_logs');
    content = content.replace(/mail_settings/g, 'call_settings');
    content = content.replace(/mail_admins/g, 'call_admins');
    content = content.replace(/mail_gateway_instances/g, 'call_gateway_instances');
    content = content.replace(/mail_agent_connections/g, 'call_agent_connections');
    content = content.replace(/mail_agent_stats/g, 'call_agent_stats');
    content = content.replace(/mail_private/g, 'call_private');
    content = content.replace(/set_mail_updated_at/g, 'set_call_updated_at');
    content = content.replace(/agent-mail/g, 'agent-call');
    content = content.replace(/Agent Mail/gi, 'Agent Call Center');
    content = content.replace(/agent_mail/g, 'agent_call');
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});

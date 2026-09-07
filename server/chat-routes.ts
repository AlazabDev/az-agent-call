// src/server/chat-routes.ts
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../web/chat-ui.html'));
});

export default router;
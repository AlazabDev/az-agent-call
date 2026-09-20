import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { RuntimeAgent } from "../../agents.js";
import { touchAgentConnection } from "../../runtimeStatus.js";
import { config } from "../../config.js";
import type { McpConnectorRegister } from "../types.js";

export const registerMigaduConnector: McpConnectorRegister = (server: McpServer, agent: RuntimeAgent) => {
  // Verify basic environment configs are present
  if (!config.migaduEmail || !config.migaduPassword) {
    return;
  }

  server.registerTool("migadu_send_email", {
    title: "Migadu Email: Send",
    description: "Send an email via SMTP using the Migadu account.",
    inputSchema: {
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body (text or HTML)"),
    },
  }, async ({ to, subject, body }) => {
    try {
      await touchAgentConnection(agent.id, "migadu_send_email").catch(() => undefined);
      
      const transporter = nodemailer.createTransport({
        host: config.migaduSmtpHost,
        port: config.migaduSmtpPort,
        secure: config.migaduSmtpTls,
        auth: {
          user: config.migaduEmail,
          pass: config.migaduPassword,
        },
      });
      
      const info = await transporter.sendMail({
        from: config.migaduEmail,
        to,
        subject,
        text: body,
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: true, domain: "migadu", action: "send_email", messageId: info.messageId }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "migadu", action: "send_email", error: message }) }] };
    }
  });

  server.registerTool("migadu_list_emails", {
    title: "Migadu Email: List",
    description: "List recent emails from a specific IMAP folder (e.g., INBOX).",
    inputSchema: {
      folder: z.string().default("INBOX").describe("Folder name to fetch from"),
      limit: z.number().default(10).describe("Number of recent emails to list"),
    },
    annotations: { readOnlyHint: true },
  }, async ({ folder, limit }) => {
    try {
      await touchAgentConnection(agent.id, "migadu_list_emails").catch(() => undefined);
      
      const client = new ImapFlow({
        host: config.imapHost,
        port: config.imapPort,
        secure: config.imapTls,
        auth: {
          user: config.migaduEmail,
          pass: config.migaduPassword,
        },
        logger: false,
      });
      
      await client.connect();
      
      const lock = await client.getMailboxLock(folder);
      const emails = [];
      try {
        if (client.mailbox && client.mailbox.exists) {
          const start = Math.max(1, client.mailbox.exists - limit + 1);
          const seq = `${start}:*`;
          for await (const message of client.fetch(seq, { envelope: true })) {
            emails.push({
              uid: message.uid,
              seq: message.seq,
              date: message.envelope.date,
              subject: message.envelope.subject,
              from: message.envelope.from,
              to: message.envelope.to,
            });
          }
        }
      } finally {
        lock.release();
      }
      
      await client.logout();
      
      // Reverse so newest is first
      emails.reverse();
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: true, domain: "migadu", action: "list_emails", data: emails }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "migadu", action: "list_emails", error: message }) }] };
    }
  });

  server.registerTool("migadu_read_email", {
    title: "Migadu Email: Read",
    description: "Read a specific email by UID and parse its content.",
    inputSchema: {
      folder: z.string().default("INBOX").describe("Folder name where the email resides"),
      uid: z.number().describe("UID of the email to read"),
    },
    annotations: { readOnlyHint: true },
  }, async ({ folder, uid }) => {
    try {
      await touchAgentConnection(agent.id, "migadu_read_email").catch(() => undefined);
      
      const client = new ImapFlow({
        host: config.imapHost,
        port: config.imapPort,
        secure: config.imapTls,
        auth: {
          user: config.migaduEmail,
          pass: config.migaduPassword,
        },
        logger: false,
      });
      
      await client.connect();
      const lock = await client.getMailboxLock(folder);
      
      let parsedEmail = null;
      try {
        const message = await client.fetchOne(uid.toString(), { source: true }, { uid: true });
        if (message && message.source) {
          const parsed = await simpleParser(message.source);
          parsedEmail = {
            subject: parsed.subject,
            from: parsed.from?.text,
            to: parsed.to?.text,
            date: parsed.date,
            text: parsed.text,
            html: parsed.html,
          };
        }
      } finally {
        lock.release();
      }
      
      await client.logout();
      
      if (!parsedEmail) {
        throw new Error("Email not found");
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ ok: true, domain: "migadu", action: "read_email", data: parsedEmail }),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, domain: "migadu", action: "read_email", error: message }) }] };
    }
  });
};

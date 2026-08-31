import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function requireAdminBasicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const encoded = header.match(/^Basic\s+(.+)$/i)?.[1];
  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      const password = separator >= 0 ? decoded.slice(separator + 1) : "";
      if (safeEqual(password, config.adminPassword)) return next();
    } catch { /* challenge below */ }
  }
  res.setHeader("WWW-Authenticate", 'Basic realm="Az Agent Mail Admin", charset="UTF-8"');
  return res.status(401).send("Authentication required");
}

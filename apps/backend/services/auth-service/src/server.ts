import dns from 'dns';
// Ensure IPv4 is prioritized for all network connections (prevents ENETUNREACH on Windows IPv6)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import path from 'path';
import dotenv from 'dotenv';

// Load service-local .env first, then root .env as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { Application } from './app';

const app = new Application();
app.listen();

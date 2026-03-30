import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import Database from "better-sqlite3";
import cron from "node-cron";
import twilio from "twilio";
import { addMonths, format, isBefore, addDays, isSameDay, parseISO } from "date-fns";
import path from "path";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const db = new Database('subtrack.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    product TEXT NOT NULL,
    duration_months INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    message_type TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );
`);

// Twilio Setup (Lazy Initialization)
let twilioClient: twilio.Twilio | null = null;
const getTwilioClient = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken) {
      twilioClient = twilio(accountSid, authToken);
    }
  }
  return twilioClient;
};

// Helper to determine status
const getStatus = (expiryDateStr: string) => {
  const expiryDate = parseISO(expiryDateStr);
  const today = new Date();
  const threeDaysFromNow = addDays(today, 3);

  if (isBefore(expiryDate, today) && !isSameDay(expiryDate, today)) {
    return 'Expired';
  } else if (isBefore(expiryDate, threeDaysFromNow) || isSameDay(expiryDate, threeDaysFromNow)) {
    return 'Expiring Soon';
  } else {
    return 'Active';
  }
};

// API Routes
app.get("/api/customers", (req, res) => {
  const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC');
  const customers = stmt.all().map((c: any) => ({
    ...c,
    status: getStatus(c.expiry_date)
  }));
  res.json(customers);
});

app.post("/api/customers", (req, res) => {
  const { name, phone, product, duration_months, start_date, payment_status, amount } = req.body;
  
  const startDate = parseISO(start_date);
  const expiryDate = addMonths(startDate, duration_months);
  const expiryDateStr = format(expiryDate, 'yyyy-MM-dd');
  const status = getStatus(expiryDateStr);

  const stmt = db.prepare(`
    INSERT INTO customers (name, phone, product, duration_months, start_date, expiry_date, payment_status, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(name, phone, product, duration_months, start_date, expiryDateStr, payment_status, amount, status);
  res.json({ id: info.lastInsertRowid, success: true });
});

app.delete("/api/customers/:id", (req, res) => {
  const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

app.get("/api/dashboard", (req, res) => {
  const customers = db.prepare('SELECT * FROM customers').all().map((c: any) => ({
    ...c,
    status: getStatus(c.expiry_date)
  }));

  const total = customers.length;
  const active = customers.filter(c => c.status === 'Active').length;
  const expired = customers.filter(c => c.status === 'Expired').length;
  const expiringSoon = customers.filter(c => c.status === 'Expiring Soon').length;

  res.json({ total, active, expired, expiringSoon });
});

// Automation Workflow (Runs daily at 9:00 AM)
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily automation workflow...');
  const customers = db.prepare('SELECT * FROM customers').all();
  const today = new Date();
  const threeDaysFromNow = addDays(today, 3);
  const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  const client = getTwilioClient();

  for (const customer of customers as any[]) {
    const expiryDate = parseISO(customer.expiry_date);
    let messageType = '';
    let messageBody = '';

    if (isSameDay(expiryDate, threeDaysFromNow)) {
      messageType = 'Reminder';
      messageBody = \`Hello \${customer.name}, your subscription will expire in 3 days. Please renew to avoid interruption.\`;
    } else if (isSameDay(expiryDate, today)) {
      messageType = 'Expired';
      messageBody = \`Hello \${customer.name}, your subscription has expired today. Contact us to renew instantly.\`;
    }

    if (messageType && client) {
      try {
        await client.messages.create({
          body: messageBody,
          from: twilioNumber,
          to: \`whatsapp:\${customer.phone}\`
        });
        
        db.prepare('INSERT INTO message_logs (customer_id, message_type, status) VALUES (?, ?, ?)')
          .run(customer.id, messageType, 'sent');
        console.log(\`Sent \${messageType} to \${customer.name}\`);
      } catch (error) {
        console.error(\`Failed to send \${messageType} to \${customer.name}:\`, error);
        db.prepare('INSERT INTO message_logs (customer_id, message_type, status) VALUES (?, ?, ?)')
          .run(customer.id, messageType, 'failed');
      }
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();

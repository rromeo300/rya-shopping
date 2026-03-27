import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(process.cwd(), 'data', 'rental.db');

// Create and initialize the database
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('airbnb', 'direct', 'both')),
    units INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    propertyId TEXT NOT NULL,
    unit TEXT,
    rentAmount REAL,
    leaseStart TEXT,
    leaseEnd TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (propertyId) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance_requests (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assignedTo TEXT,
    cost REAL,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (propertyId) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    tenantId TEXT NOT NULL,
    propertyId TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'rent' CHECK(type IN ('rent', 'deposit', 'maintenance', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
    dueDate TEXT,
    paidDate TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (tenantId) REFERENCES tenants(id),
    FOREIGN KEY (propertyId) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    dueDate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'cancelled')),
    category TEXT NOT NULL DEFAULT 'general' CHECK(category IN ('rent', 'maintenance', 'contract', 'general', 'checkin', 'checkout')),
    relatedId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'web' CHECK(source IN ('web', 'telegram', 'whatsapp')),
    userId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversationId TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (conversationId) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    propertyId TEXT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    vendor TEXT,
    date TEXT NOT NULL,
    paymentMethod TEXT DEFAULT 'efectivo',
    receiptUrl TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (propertyId) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS income_records (
    id TEXT PRIMARY KEY,
    propertyId TEXT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'direct',
    date TEXT NOT NULL,
    tenantId TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (propertyId) REFERENCES properties(id),
    FOREIGN KEY (tenantId) REFERENCES tenants(id)
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'pieza',
    condition TEXT NOT NULL DEFAULT 'good',
    purchaseValue REAL,
    purchaseDate TEXT,
    location TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (propertyId) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS learned_memory (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'preference',
    confidence REAL DEFAULT 1.0,
    timesReinforced INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    tenantId TEXT,
    guestName TEXT NOT NULL,
    guestPhone TEXT,
    guestWhatsapp TEXT,
    checkInDate TEXT NOT NULL,
    checkOutDate TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','checked_in','checked_out','cancelled')),
    keyCode TEXT,
    wifiName TEXT,
    wifiPassword TEXT,
    parkingInfo TEXT,
    specialInstructions TEXT,
    notes TEXT,
    instructionsSentAt TEXT,
    checkoutSentAt TEXT,
    rating INTEGER,
    reviewNotes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (propertyId) REFERENCES properties(id)
  );

  CREATE TABLE IF NOT EXISTS wa_contacts (
    jid TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    pushName TEXT,
    isBlocked INTEGER DEFAULT 0,
    labels TEXT DEFAULT '[]',
    lastSeen TEXT,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wa_labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color INTEGER DEFAULT 0,
    predefinedId TEXT,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wa_conversations (
    jid TEXT PRIMARY KEY,
    name TEXT,
    unreadCount INTEGER DEFAULT 0,
    lastMessage TEXT,
    lastMessageTime TEXT,
    labels TEXT DEFAULT '[]',
    archived INTEGER DEFAULT 0,
    pinned INTEGER DEFAULT 0,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wa_messages (
    id TEXT PRIMARY KEY,
    jid TEXT NOT NULL,
    content TEXT,
    fromMe INTEGER DEFAULT 0,
    senderName TEXT,
    timestamp TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    FOREIGN KEY (jid) REFERENCES wa_conversations(jid)
  );
`);

// ============================================================
// TypeScript Interfaces
// ============================================================

export interface Property {
  id: string;
  name: string;
  address: string;
  type: 'airbnb' | 'direct' | 'both';
  units: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  propertyId: string;
  unit?: string;
  rentAmount?: number;
  leaseStart?: string;
  leaseEnd?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  cost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  type: 'rent' | 'deposit' | 'maintenance' | 'other';
  status: 'pending' | 'paid' | 'overdue';
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'done' | 'cancelled';
  category: 'rent' | 'maintenance' | 'contract' | 'general' | 'checkin' | 'checkout';
  relatedId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  source: 'web' | 'telegram' | 'whatsapp';
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  pendingPayments: number;
  overdueCount: number;
  pendingCount: number;
}

export interface DashboardStats {
  propertiesCount: number;
  tenantsCount: number;
  activeMaintenance: number;
  pendingReminders: number;
}

// ============================================================
// CRUD Helpers — Properties
// ============================================================

export function getProperties(): Property[] {
  return db.prepare('SELECT * FROM properties ORDER BY createdAt DESC').all() as Property[];
}

export function getProperty(id: string): Property | undefined {
  return db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as Property | undefined;
}

export function createProperty(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Property {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const property: Property = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO properties (id, name, address, type, units, notes, createdAt, updatedAt)
    VALUES (@id, @name, @address, @type, @units, @notes, @createdAt, @updatedAt)
  `).run(property);
  return property;
}

export function updateProperty(id: string, data: Partial<Omit<Property, 'id' | 'createdAt'>>): Property | undefined {
  const existing = getProperty(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE properties SET name=@name, address=@address, type=@type, units=@units,
    notes=@notes, updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

export function deleteProperty(id: string): boolean {
  const result = db.prepare('DELETE FROM properties WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================
// CRUD Helpers — Tenants
// ============================================================

export function getTenants(propertyId?: string): Tenant[] {
  if (propertyId) {
    return db.prepare('SELECT * FROM tenants WHERE propertyId = ? ORDER BY createdAt DESC').all(propertyId) as Tenant[];
  }
  return db.prepare('SELECT * FROM tenants ORDER BY createdAt DESC').all() as Tenant[];
}

export function getTenant(id: string): Tenant | undefined {
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as Tenant | undefined;
}

export function createTenant(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Tenant {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const tenant: Tenant = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO tenants (id, name, email, phone, propertyId, unit, rentAmount,
    leaseStart, leaseEnd, status, notes, createdAt, updatedAt)
    VALUES (@id, @name, @email, @phone, @propertyId, @unit, @rentAmount,
    @leaseStart, @leaseEnd, @status, @notes, @createdAt, @updatedAt)
  `).run(tenant);
  return tenant;
}

export function updateTenant(id: string, data: Partial<Omit<Tenant, 'id' | 'createdAt'>>): Tenant | undefined {
  const existing = getTenant(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE tenants SET name=@name, email=@email, phone=@phone, propertyId=@propertyId,
    unit=@unit, rentAmount=@rentAmount, leaseStart=@leaseStart, leaseEnd=@leaseEnd,
    status=@status, notes=@notes, updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

// ============================================================
// CRUD Helpers — Maintenance Requests
// ============================================================

export interface MaintenanceFilters {
  status?: string;
  priority?: string;
  propertyId?: string;
}

export function getMaintenanceRequests(filters?: MaintenanceFilters): MaintenanceRequest[] {
  let query = 'SELECT * FROM maintenance_requests WHERE 1=1';
  const params: Record<string, string> = {};
  if (filters?.status) { query += ' AND status = @status'; params.status = filters.status; }
  if (filters?.priority) { query += ' AND priority = @priority'; params.priority = filters.priority; }
  if (filters?.propertyId) { query += ' AND propertyId = @propertyId'; params.propertyId = filters.propertyId; }
  query += ' ORDER BY createdAt DESC';
  return db.prepare(query).all(params) as MaintenanceRequest[];
}

export function createMaintenanceRequest(data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>): MaintenanceRequest {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const req: MaintenanceRequest = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO maintenance_requests (id, propertyId, title, description, priority, status,
    assignedTo, cost, notes, createdAt, updatedAt)
    VALUES (@id, @propertyId, @title, @description, @priority, @status,
    @assignedTo, @cost, @notes, @createdAt, @updatedAt)
  `).run(req);
  return req;
}

export function updateMaintenanceRequest(id: string, data: Partial<Omit<MaintenanceRequest, 'id' | 'createdAt'>>): MaintenanceRequest | undefined {
  const existing = db.prepare('SELECT * FROM maintenance_requests WHERE id = ?').get(id) as MaintenanceRequest | undefined;
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE maintenance_requests SET propertyId=@propertyId, title=@title, description=@description,
    priority=@priority, status=@status, assignedTo=@assignedTo, cost=@cost, notes=@notes,
    updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

// ============================================================
// CRUD Helpers — Payments
// ============================================================

export interface PaymentFilters {
  status?: string;
  type?: string;
  tenantId?: string;
  propertyId?: string;
}

export function getPayments(filters?: PaymentFilters): Payment[] {
  let query = 'SELECT * FROM payments WHERE 1=1';
  const params: Record<string, string> = {};
  if (filters?.status) { query += ' AND status = @status'; params.status = filters.status; }
  if (filters?.type) { query += ' AND type = @type'; params.type = filters.type; }
  if (filters?.tenantId) { query += ' AND tenantId = @tenantId'; params.tenantId = filters.tenantId; }
  if (filters?.propertyId) { query += ' AND propertyId = @propertyId'; params.propertyId = filters.propertyId; }
  query += ' ORDER BY dueDate DESC';
  return db.prepare(query).all(params) as Payment[];
}

export function createPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Payment {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const payment: Payment = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO payments (id, tenantId, propertyId, amount, type, status, dueDate, paidDate, notes, createdAt, updatedAt)
    VALUES (@id, @tenantId, @propertyId, @amount, @type, @status, @dueDate, @paidDate, @notes, @createdAt, @updatedAt)
  `).run(payment);
  return payment;
}

export function updatePayment(id: string, data: Partial<Omit<Payment, 'id' | 'createdAt'>>): Payment | undefined {
  const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment | undefined;
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE payments SET tenantId=@tenantId, propertyId=@propertyId, amount=@amount, type=@type,
    status=@status, dueDate=@dueDate, paidDate=@paidDate, notes=@notes, updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

// ============================================================
// CRUD Helpers — Reminders
// ============================================================

export function getReminders(status?: string): Reminder[] {
  if (status) {
    return db.prepare('SELECT * FROM reminders WHERE status = ? ORDER BY dueDate ASC').all(status) as Reminder[];
  }
  return db.prepare('SELECT * FROM reminders ORDER BY dueDate ASC').all() as Reminder[];
}

export function createReminder(data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Reminder {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const reminder: Reminder = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO reminders (id, title, description, dueDate, status, category, relatedId, createdAt, updatedAt)
    VALUES (@id, @title, @description, @dueDate, @status, @category, @relatedId, @createdAt, @updatedAt)
  `).run(reminder);
  return reminder;
}

export function updateReminder(id: string, data: Partial<Omit<Reminder, 'id' | 'createdAt'>>): Reminder | undefined {
  const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder | undefined;
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE reminders SET title=@title, description=@description, dueDate=@dueDate, status=@status,
    category=@category, relatedId=@relatedId, updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

// ============================================================
// CRUD Helpers — Conversations & Messages
// ============================================================

export function getOrCreateConversation(source: 'web' | 'telegram' | 'whatsapp', userId?: string): Conversation {
  const now = new Date().toISOString();
  // For telegram/whatsapp, reuse existing conversation by userId
  if (userId) {
    const existing = db.prepare(
      'SELECT * FROM conversations WHERE source = ? AND userId = ? ORDER BY updatedAt DESC LIMIT 1'
    ).get(source, userId) as Conversation | undefined;
    if (existing) {
      // Update updatedAt
      db.prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?').run(now, existing.id);
      return { ...existing, updatedAt: now };
    }
  }
  const id = crypto.randomUUID();
  const conversation: Conversation = { id, source, userId, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO conversations (id, source, userId, createdAt, updatedAt)
    VALUES (@id, @source, @userId, @createdAt, @updatedAt)
  `).run(conversation);
  return conversation;
}

export function addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Message {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const message: Message = { id, conversationId, role, content, createdAt: now };
  db.prepare(`
    INSERT INTO messages (id, conversationId, role, content, createdAt)
    VALUES (@id, @conversationId, @role, @content, @createdAt)
  `).run(message);
  // Update conversation updatedAt
  db.prepare('UPDATE conversations SET updatedAt = ? WHERE id = ?').run(now, conversationId);
  return message;
}

export function getMessages(conversationId: string): Message[] {
  return db.prepare('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC').all(conversationId) as Message[];
}

// ============================================================
// Aggregate / Summary Functions
// ============================================================

export function getFinancialSummary(): FinancialSummary {
  const incomeRow = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND type IN ('rent', 'deposit', 'other')"
  ).get() as { total: number };

  const expensesRow = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND type = 'maintenance'"
  ).get() as { total: number };

  const pendingRow = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'pending'"
  ).get() as { total: number };

  const overdueRow = db.prepare(
    "SELECT COUNT(*) as count FROM payments WHERE status = 'overdue'"
  ).get() as { count: number };

  const pendingCountRow = db.prepare(
    "SELECT COUNT(*) as count FROM payments WHERE status = 'pending'"
  ).get() as { count: number };

  return {
    totalIncome: incomeRow.total,
    totalExpenses: expensesRow.total,
    pendingPayments: pendingRow.total,
    overdueCount: overdueRow.count,
    pendingCount: pendingCountRow.count,
  };
}

export function getDashboardStats(): DashboardStats {
  const propertiesRow = db.prepare('SELECT COUNT(*) as count FROM properties').get() as { count: number };
  const tenantsRow = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'active'").get() as { count: number };
  const maintenanceRow = db.prepare(
    "SELECT COUNT(*) as count FROM maintenance_requests WHERE status IN ('pending', 'in_progress')"
  ).get() as { count: number };
  const remindersRow = db.prepare(
    "SELECT COUNT(*) as count FROM reminders WHERE status = 'pending'"
  ).get() as { count: number };

  return {
    propertiesCount: propertiesRow.count,
    tenantsCount: tenantsRow.count,
    activeMaintenance: maintenanceRow.count,
    pendingReminders: remindersRow.count,
  };
}

// ============================================================
// TypeScript Interfaces — New Modules
// ============================================================

export interface Expense {
  id: string;
  propertyId?: string;
  title: string;
  amount: number;
  category: string;
  vendor?: string;
  date: string;
  paymentMethod: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeRecord {
  id: string;
  propertyId?: string;
  title: string;
  amount: number;
  source: 'airbnb' | 'direct' | 'other';
  date: string;
  tenantId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  propertyId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  purchaseValue?: number;
  purchaseDate?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearnedMemory {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'business_rule' | 'pattern' | 'contact' | 'fact';
  confidence: number;
  timesReinforced: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// CRUD — Expenses
// ============================================================

export function getExpenses(propertyId?: string, category?: string): Expense[] {
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params: Record<string, string> = {};
  if (propertyId) { query += ' AND propertyId = @propertyId'; params.propertyId = propertyId; }
  if (category)   { query += ' AND category = @category'; params.category = category; }
  query += ' ORDER BY date DESC';
  return db.prepare(query).all(params) as Expense[];
}

export function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const expense: Expense = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO expenses (id, propertyId, title, amount, category, vendor, date,
    paymentMethod, receiptUrl, notes, createdAt, updatedAt)
    VALUES (@id, @propertyId, @title, @amount, @category, @vendor, @date,
    @paymentMethod, @receiptUrl, @notes, @createdAt, @updatedAt)
  `).run(expense);
  return expense;
}

export function updateExpense(id: string, data: Partial<Omit<Expense, 'id' | 'createdAt'>>): Expense | undefined {
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense | undefined;
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE expenses SET propertyId=@propertyId, title=@title, amount=@amount, category=@category,
    vendor=@vendor, date=@date, paymentMethod=@paymentMethod, receiptUrl=@receiptUrl,
    notes=@notes, updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

export function getExpenseSummary(propertyId?: string): Record<string, number> {
  let query = 'SELECT category, SUM(amount) as total FROM expenses WHERE 1=1';
  const params: Record<string, string> = {};
  if (propertyId) { query += ' AND propertyId = @propertyId'; params.propertyId = propertyId; }
  query += ' GROUP BY category ORDER BY total DESC';
  const rows = db.prepare(query).all(params) as { category: string; total: number }[];
  return Object.fromEntries(rows.map(r => [r.category, r.total]));
}

// ============================================================
// CRUD — Income Records
// ============================================================

export function getIncomeRecords(propertyId?: string, source?: string): IncomeRecord[] {
  let query = 'SELECT * FROM income_records WHERE 1=1';
  const params: Record<string, string> = {};
  if (propertyId) { query += ' AND propertyId = @propertyId'; params.propertyId = propertyId; }
  if (source)     { query += ' AND source = @source'; params.source = source; }
  query += ' ORDER BY date DESC';
  return db.prepare(query).all(params) as IncomeRecord[];
}

export function createIncomeRecord(data: Omit<IncomeRecord, 'id' | 'createdAt' | 'updatedAt'>): IncomeRecord {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const record: IncomeRecord = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO income_records (id, propertyId, title, amount, source, date, tenantId, notes, createdAt, updatedAt)
    VALUES (@id, @propertyId, @title, @amount, @source, @date, @tenantId, @notes, @createdAt, @updatedAt)
  `).run(record);
  return record;
}

export function getIncomeSummary(propertyId?: string): { total: number; bySource: Record<string, number> } {
  let query = 'SELECT source, SUM(amount) as total FROM income_records WHERE 1=1';
  const params: Record<string, string> = {};
  if (propertyId) { query += ' AND propertyId = @propertyId'; params.propertyId = propertyId; }
  query += ' GROUP BY source';
  const rows = db.prepare(query).all(params) as { source: string; total: number }[];
  const bySource = Object.fromEntries(rows.map(r => [r.source, r.total]));
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  return { total, bySource };
}

// ============================================================
// CRUD — Inventory
// ============================================================

export function getInventory(propertyId?: string, category?: string): InventoryItem[] {
  let query = 'SELECT * FROM inventory_items WHERE 1=1';
  const params: Record<string, string> = {};
  if (propertyId) { query += ' AND propertyId = @propertyId'; params.propertyId = propertyId; }
  if (category)   { query += ' AND category = @category'; params.category = category; }
  query += ' ORDER BY category, name';
  return db.prepare(query).all(params) as InventoryItem[];
}

export function createInventoryItem(data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): InventoryItem {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const item: InventoryItem = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO inventory_items (id, propertyId, name, category, quantity, unit, condition,
    purchaseValue, purchaseDate, location, notes, createdAt, updatedAt)
    VALUES (@id, @propertyId, @name, @category, @quantity, @unit, @condition,
    @purchaseValue, @purchaseDate, @location, @notes, @createdAt, @updatedAt)
  `).run(item);
  return item;
}

export function updateInventoryItem(id: string, data: Partial<Omit<InventoryItem, 'id' | 'createdAt'>>): InventoryItem | undefined {
  const existing = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id) as InventoryItem | undefined;
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE inventory_items SET propertyId=@propertyId, name=@name, category=@category,
    quantity=@quantity, unit=@unit, condition=@condition, purchaseValue=@purchaseValue,
    purchaseDate=@purchaseDate, location=@location, notes=@notes, updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

// ============================================================
// Learned Memory — Self-Improvement
// ============================================================

export function getAllMemory(): LearnedMemory[] {
  return db.prepare('SELECT * FROM learned_memory ORDER BY timesReinforced DESC').all() as LearnedMemory[];
}

export function getMemoryByCategory(category: string): LearnedMemory[] {
  return db.prepare('SELECT * FROM learned_memory WHERE category = ? ORDER BY timesReinforced DESC').all(category) as LearnedMemory[];
}

export function saveMemory(key: string, value: string, category: LearnedMemory['category'] = 'preference'): LearnedMemory {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM learned_memory WHERE key = ?').get(key) as LearnedMemory | undefined;
  if (existing) {
    const updated = {
      ...existing,
      value,
      timesReinforced: existing.timesReinforced + 1,
      updatedAt: now,
    };
    db.prepare(`
      UPDATE learned_memory SET value=@value, timesReinforced=@timesReinforced, updatedAt=@updatedAt WHERE key=@key
    `).run(updated);
    return updated;
  }
  const id = crypto.randomUUID();
  const memory: LearnedMemory = { id, key, value, category, confidence: 1.0, timesReinforced: 1, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO learned_memory (id, key, value, category, confidence, timesReinforced, createdAt, updatedAt)
    VALUES (@id, @key, @value, @category, @confidence, @timesReinforced, @createdAt, @updatedAt)
  `).run(memory);
  return memory;
}

export function deleteMemory(key: string): boolean {
  return db.prepare('DELETE FROM learned_memory WHERE key = ?').run(key).changes > 0;
}

export function getMemoryContext(): string {
  const memories = getAllMemory();
  if (memories.length === 0) return '';
  const lines = memories.map(m => `- [${m.category}] ${m.key}: ${m.value}`);
  return '\n\nCONOCIMIENTO APRENDIDO DEL USUARIO:\n' + lines.join('\n');
}

export { db };

// ============================================================
// TypeScript Interface — Check-in / Check-out
// ============================================================

export interface Checkin {
  id: string;
  propertyId: string;
  tenantId?: string;
  guestName: string;
  guestPhone?: string;
  guestWhatsapp?: string;
  checkInDate: string;
  checkOutDate?: string;
  status: 'scheduled' | 'checked_in' | 'checked_out' | 'cancelled';
  keyCode?: string;
  wifiName?: string;
  wifiPassword?: string;
  parkingInfo?: string;
  specialInstructions?: string;
  notes?: string;
  instructionsSentAt?: string;
  checkoutSentAt?: string;
  rating?: number;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export function getCheckins(status?: string): Checkin[] {
  if (status) {
    return db.prepare('SELECT * FROM checkins WHERE status = ? ORDER BY checkInDate ASC').all(status) as Checkin[];
  }
  return db.prepare('SELECT * FROM checkins ORDER BY checkInDate DESC').all() as Checkin[];
}

export function getCheckin(id: string): Checkin | undefined {
  return db.prepare('SELECT * FROM checkins WHERE id = ?').get(id) as Checkin | undefined;
}

export function createCheckin(data: Omit<Checkin, 'id' | 'createdAt' | 'updatedAt'>): Checkin {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const checkin: Checkin = { id, ...data, createdAt: now, updatedAt: now };
  db.prepare(`
    INSERT INTO checkins (id, propertyId, tenantId, guestName, guestPhone, guestWhatsapp,
    checkInDate, checkOutDate, status, keyCode, wifiName, wifiPassword, parkingInfo,
    specialInstructions, notes, instructionsSentAt, checkoutSentAt, rating, reviewNotes,
    createdAt, updatedAt)
    VALUES (@id, @propertyId, @tenantId, @guestName, @guestPhone, @guestWhatsapp,
    @checkInDate, @checkOutDate, @status, @keyCode, @wifiName, @wifiPassword, @parkingInfo,
    @specialInstructions, @notes, @instructionsSentAt, @checkoutSentAt, @rating, @reviewNotes,
    @createdAt, @updatedAt)
  `).run(checkin);
  return checkin;
}

export function updateCheckin(id: string, data: Partial<Omit<Checkin, 'id' | 'createdAt'>>): Checkin | undefined {
  const existing = getCheckin(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE checkins SET propertyId=@propertyId, tenantId=@tenantId, guestName=@guestName,
    guestPhone=@guestPhone, guestWhatsapp=@guestWhatsapp, checkInDate=@checkInDate,
    checkOutDate=@checkOutDate, status=@status, keyCode=@keyCode, wifiName=@wifiName,
    wifiPassword=@wifiPassword, parkingInfo=@parkingInfo, specialInstructions=@specialInstructions,
    notes=@notes, instructionsSentAt=@instructionsSentAt, checkoutSentAt=@checkoutSentAt,
    rating=@rating, reviewNotes=@reviewNotes, updatedAt=@updatedAt WHERE id=@id
  `).run(updated);
  return updated;
}

export function getTodayCheckins(): Checkin[] {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(
    "SELECT * FROM checkins WHERE DATE(checkInDate) = ? AND status IN ('scheduled','checked_in')"
  ).all(today) as Checkin[];
}

export function getTodayCheckouts(): Checkin[] {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(
    "SELECT * FROM checkins WHERE DATE(checkOutDate) = ? AND status = 'checked_in'"
  ).all(today) as Checkin[];
}

// ============================================================
// TypeScript Interfaces — WhatsApp Business Observer
// ============================================================

export interface WAContact {
  jid: string;
  name?: string;
  phone?: string;
  pushName?: string;
  isBlocked: number;
  labels: string; // JSON array string
  lastSeen?: string;
  updatedAt: string;
}

export interface WALabel {
  id: string;
  name: string;
  color: number;
  predefinedId?: string;
  updatedAt: string;
}

export interface WAConversation {
  jid: string;
  name?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  labels: string; // JSON array string
  archived: number;
  pinned: number;
  updatedAt: string;
}

export interface WAMessage {
  id: string;
  jid: string;
  content?: string;
  fromMe: number;
  senderName?: string;
  timestamp: string;
  type: string;
}

// ============================================================
// CRUD — WhatsApp Business Observer
// ============================================================

export function upsertWAContact(data: Omit<WAContact, 'updatedAt'>): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO wa_contacts (jid, name, phone, pushName, isBlocked, labels, lastSeen, updatedAt)
    VALUES (@jid, @name, @phone, @pushName, @isBlocked, @labels, @lastSeen, @updatedAt)
    ON CONFLICT(jid) DO UPDATE SET
      name=COALESCE(@name, name), phone=COALESCE(@phone, phone),
      pushName=COALESCE(@pushName, pushName), isBlocked=@isBlocked,
      labels=@labels, lastSeen=COALESCE(@lastSeen, lastSeen), updatedAt=@updatedAt
  `).run({ ...data, updatedAt: now });
}

export function getWAContacts(): WAContact[] {
  return db.prepare('SELECT * FROM wa_contacts ORDER BY name ASC').all() as WAContact[];
}

export function updateWAContactLabels(jid: string, labels: string[]): void {
  db.prepare('UPDATE wa_contacts SET labels=?, updatedAt=? WHERE jid=?')
    .run(JSON.stringify(labels), new Date().toISOString(), jid);
}

export function upsertWALabel(data: Omit<WALabel, 'updatedAt'>): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO wa_labels (id, name, color, predefinedId, updatedAt)
    VALUES (@id, @name, @color, @predefinedId, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET name=@name, color=@color, updatedAt=@updatedAt
  `).run({ ...data, updatedAt: now });
}

export function getWALabels(): WALabel[] {
  return db.prepare('SELECT * FROM wa_labels ORDER BY name ASC').all() as WALabel[];
}

export function upsertWAConversation(data: Omit<WAConversation, 'updatedAt'>): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO wa_conversations (jid, name, unreadCount, lastMessage, lastMessageTime, labels, archived, pinned, updatedAt)
    VALUES (@jid, @name, @unreadCount, @lastMessage, @lastMessageTime, @labels, @archived, @pinned, @updatedAt)
    ON CONFLICT(jid) DO UPDATE SET
      name=COALESCE(@name, name), unreadCount=@unreadCount,
      lastMessage=COALESCE(@lastMessage, lastMessage),
      lastMessageTime=COALESCE(@lastMessageTime, lastMessageTime),
      labels=@labels, archived=@archived, pinned=@pinned, updatedAt=@updatedAt
  `).run({ ...data, updatedAt: now });
}

export function getWAConversations(archived = false): WAConversation[] {
  return db.prepare(
    'SELECT * FROM wa_conversations WHERE archived=? ORDER BY lastMessageTime DESC'
  ).all(archived ? 1 : 0) as WAConversation[];
}

export function updateWAConversationLabels(jid: string, labels: string[]): void {
  db.prepare('UPDATE wa_conversations SET labels=?, updatedAt=? WHERE jid=?')
    .run(JSON.stringify(labels), new Date().toISOString(), jid);
}

export function archiveWAConversation(jid: string, archived: boolean): void {
  db.prepare('UPDATE wa_conversations SET archived=?, updatedAt=? WHERE jid=?')
    .run(archived ? 1 : 0, new Date().toISOString(), jid);
}

export function insertWAMessage(data: WAMessage): void {
  db.prepare(`
    INSERT OR IGNORE INTO wa_messages (id, jid, content, fromMe, senderName, timestamp, type)
    VALUES (@id, @jid, @content, @fromMe, @senderName, @timestamp, @type)
  `).run(data);
}

export function getWAMessages(jid: string, limit = 50): WAMessage[] {
  return db.prepare(
    'SELECT * FROM wa_messages WHERE jid=? ORDER BY timestamp DESC LIMIT ?'
  ).all(jid, limit) as WAMessage[];
}

export function getWAStats(): { contacts: number; conversations: number; unread: number; labels: number } {
  const contacts = (db.prepare('SELECT COUNT(*) as c FROM wa_contacts').get() as { c: number }).c;
  const conversations = (db.prepare('SELECT COUNT(*) as c FROM wa_conversations WHERE archived=0').get() as { c: number }).c;
  const unread = (db.prepare('SELECT COALESCE(SUM(unreadCount),0) as c FROM wa_conversations WHERE archived=0').get() as { c: number }).c;
  const labels = (db.prepare('SELECT COUNT(*) as c FROM wa_labels').get() as { c: number }).c;
  return { contacts, conversations, unread, labels };
}

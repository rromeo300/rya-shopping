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

export { db };

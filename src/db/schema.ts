import { relations } from 'drizzle-orm';
import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tenants / Store OS establishments
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  segment: text('segment').notNull().default('food_service'),
  ownerUid: text('owner_uid').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Catalog & inventory products
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id),
  name: text('name').notNull(),
  category: text('category').notNull().default('general'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  description: text('description'),
  active: text('active').notNull().default('true'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Orders (PDV, Delivery, Salão, Vitrine Pública)
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id),
  userUid: text('user_uid'),
  customerName: text('customer_name').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0.00'),
  status: text('status').notNull().default('pending'),
  type: text('type').notNull().default('dine_in'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit logs for compliance and zero-trust tracking
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  actorUid: text('actor_uid').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  products: many(products),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
}));

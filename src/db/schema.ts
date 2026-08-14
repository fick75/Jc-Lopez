import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  space: varchar('space', { length: 50 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 5 }).notNull(), // HH:MM
  name: text('name').notNull(),
  email: text('email').notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, CONFIRMED, REJECTED
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

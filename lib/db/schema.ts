import { real, text, timestamp, unique, uniqueIndex, pgTable } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified').notNull().defaultNow(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const book = pgTable('book', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  audioUrl: text('audioUrl').notNull(),
  jsonUrl: text('jsonUrl').notNull(),
  durationSeconds: real('durationSeconds'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ userBookNameUnique: unique('book_user_name_unique').on(table.userId, table.name) }))

export const audiobookProgress = pgTable('audiobookProgress', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  bookId: text('bookId'),
  bookName: text('bookName').notNull(),
  currentTime: real('currentTime').notNull().default(0),
  listenedSeconds: real('listenedSeconds'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  userBookUnique: unique('audiobookProgress_user_book_unique').on(table.userId, table.bookName),
  userBookIdUnique: uniqueIndex('audiobookProgress_user_book_id_unique').on(table.userId, table.bookId),
}))

import { pgTable, unique, uuid, text, boolean, timestamp, index, foreignKey, varchar, json, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name"),
	email: text(),
	passwordHash: text("password_hash"),
	avatarUrl: text("avatar_url"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_key").on(table.email),
]);

export const oauthStates = pgTable("oauth_states", {
	state: text("state").primaryKey(),
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
	resume: text("resume"),
});

export const ssoAccounts = pgTable("sso_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	providerId: text("provider_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("sso_accounts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "sso_accounts_user_id_fkey"
	}),
	unique("sso_accounts_provider_provider_id_key").on(table.provider, table.providerId),
]);

export const clients = pgTable("clients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ownerId: uuid("owner_id").notNull(),
	secretHash: text("secret_hash").notNull(),
	name: text().notNull(),
	redirectUris: text("redirect_uris").array().default([""]),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	pkceRequired: boolean("pkce_required").default(false).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.ownerId],
		foreignColumns: [users.id],
		name: "clients_owner_id_fkey"
	}),
	index("clients_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("uuid_ops")),
]);

export const authCodes = pgTable("auth_codes", {
	code: text().primaryKey().notNull(),
	clientId: uuid("client_id").notNull(),
	userId: uuid("user_id").notNull(),
	codeChallenge: text("code_challenge"),
	redirectUri: text("redirect_uri"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("auth_codes_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [clients.id],
		name: "auth_codes_client_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "auth_codes_user_id_fkey"
	}),
]);

export const refreshTokens = pgTable("refresh_tokens", {
	tokenHash: text("token_hash").primaryKey().notNull(),
	familyId: uuid("family_id").notNull(),
	userId: uuid("user_id").notNull(),
	clientId: uuid("client_id").notNull(),
	used: boolean().default(false),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("refresh_tokens_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("refresh_tokens_family_id_idx").using("btree", table.familyId.asc().nullsLast().op("uuid_ops")),
	index("refresh_tokens_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.clientId],
		foreignColumns: [clients.id],
		name: "refresh_tokens_client_id_fkey"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "refresh_tokens_user_id_fkey"
	}),
]);

export const session = pgTable("session", {
	sid: varchar("sid").primaryKey().notNull(),
	sess: json("sess").notNull(),
	expire: timestamp("expire", { precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc()),
]);

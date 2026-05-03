import { relations } from "drizzle-orm/relations";
import { users, ssoAccounts, clients, authCodes, refreshTokens } from "./schema.js";

export const ssoAccountsRelations = relations(ssoAccounts, ({one}) => ({
	user: one(users, {
		fields: [ssoAccounts.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	ssoAccounts: many(ssoAccounts),
	authCodes: many(authCodes),
	refreshTokens: many(refreshTokens),
	clients: many(clients),
}));

export const authCodesRelations = relations(authCodes, ({one}) => ({
	client: one(clients, {
		fields: [authCodes.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [authCodes.userId],
		references: [users.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	owner: one(users, {
		fields: [clients.ownerId],
		references: [users.id]
	}),
	authCodes: many(authCodes),
	refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	client: one(clients, {
		fields: [refreshTokens.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [refreshTokens.userId],
		references: [users.id]
	}),
}));
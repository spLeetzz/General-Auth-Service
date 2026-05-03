import { db } from "../../db/db.js";
import { clients } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import ApiError from "../../utility/api.error.js";

export async function createClient(
  ownerId: string,
  secretHash: string,
  name: string,
  redirectUris: string[],
  pkceRequired: boolean,
) {
  const [client] = await db
    .insert(clients)
    .values({ ownerId, secretHash, name, redirectUris, pkceRequired })
    .returning();
  return client;
}

export async function changeRedirectUris(
  clientId: string,
  ownerId: string,
  urisToAdd: string[],
  urisToRemove: string[],
) {
  const [client] = await db
    .select({ redirectUris: clients.redirectUris, ownerId: clients.ownerId })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, ownerId)));

  if (!client) throw ApiError.notFound("Client not found");

  const arr = (client.redirectUris ?? []).filter(
    (uri) => !urisToRemove.includes(uri),
  );
  urisToAdd.forEach((uri) => {
    if (!arr.includes(uri)) arr.push(uri);
  });

  const [updated] = await db
    .update(clients)
    .set({ redirectUris: arr, updatedAt: new Date().toISOString() })
    .where(eq(clients.id, clientId))
    .returning();

  return updated;
}

export async function rotateSecret(clientId: string, ownerId: string, secretHash: string) {
  const [updated] = await db
    .update(clients)
    .set({ secretHash, updatedAt: new Date().toISOString() })
    .where(and(eq(clients.id, clientId), eq(clients.ownerId, ownerId)))
    .returning();
  return updated;
}


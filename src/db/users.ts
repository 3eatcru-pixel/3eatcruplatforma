import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

export interface UpsertUserInput {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
}

export async function getOrCreateUser(input: UpsertUserInput) {
  try {
    const result = await db.insert(users)
      .values({
        uid: input.uid,
        email: input.email,
        displayName: input.displayName || null,
        role: input.role || 'user',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: input.email,
          ...(input.displayName ? { displayName: input.displayName } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Database operation failed. Please try again later.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const records = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return records[0] || null;
  } catch (error) {
    console.error('Database getUserByUid failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database getAllUsers failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

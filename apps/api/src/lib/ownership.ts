import { prisma } from "../db/client.js";

// Small shared lookups every owner-scoped route needs: "does this authenticated
// user have a Creator/Client profile, and which row is it?" Returns null rather
// than throwing — callers decide the HTTP response (usually 403/404).

export function findOwnCreator(userId: string) {
  return prisma.creator.findUnique({ where: { userId } });
}

export function findOwnClient(userId: string) {
  return prisma.client.findUnique({ where: { userId } });
}

/** Returns which side of a booking the given user is on ("creator" | "client"),
 * or null if they're neither participant. Used to scope bookings/order-rooms
 * to only the two people actually on the deal. */
export function bookingParticipantRole(
  booking: { creator: { userId: string }; client: { userId: string } },
  userId: string,
): "creator" | "client" | null {
  if (booking.creator.userId === userId) return "creator";
  if (booking.client.userId === userId) return "client";
  return null;
}

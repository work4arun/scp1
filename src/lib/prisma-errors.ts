// Translate Prisma error codes into user-friendly messages.
// Server actions should return these strings as `{ success: false, error }`
// rather than throwing — thrown errors are replaced with opaque
// `digest:` blobs by Next.js in production builds.

import { Prisma } from "@prisma/client";

export function friendlyPrismaError(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        // Unique constraint
        return "A record with the same identifier already exists. Please refresh and try again.";
      case "P2003":
        // Foreign key violation
        return "One of the selected references (vertical, priority, owner, etc.) no longer exists. Please refresh and pick from the latest list.";
      case "P2025":
        // Record not found
        return "The record was not found. It may have been deleted by someone else — please refresh.";
      case "P2014":
        return "This action would break a required relationship. Please contact support.";
      case "P2000":
        return "One of your inputs is too long for the database column. Please shorten it and try again.";
      default:
        return `Database error (${err.code}): ${err.message.split("\n")[0]}`;
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return "The data sent to the database was invalid. This is usually a code/schema mismatch — please contact support.";
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return "The application cannot reach the database. Please contact support.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return null;
}

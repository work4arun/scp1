import { redirect } from "next/navigation";

// The "Dropped Archive" feature has been retired — tasks are hard-deleted now,
// so this archive no longer holds anything. Anyone landing on the old URL is
// bounced back to the task register.
export default function DroppedArchive() {
  redirect("/sm/tasks");
}

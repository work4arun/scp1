import type { TokenUser } from "@/lib/token-auth";

export function ExternalHeader({ user }: { user: TokenUser }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <div>
        <h1 className="text-sm font-semibold">{user.teamName}</h1>
        <p className="text-xs text-muted-foreground">External Task Portal</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium">{user.memberName}</p>
        <p className="text-[10px] text-muted-foreground">{user.memberEmail}</p>
      </div>
    </header>
  );
}
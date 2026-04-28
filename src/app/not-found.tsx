import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-muted text-muted-foreground grid place-items-center text-xl font-bold mb-4">404</div>
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or you don't have access.</p>
        <div className="mt-6">
          <Button asChild><Link href="/">Go home</Link></Button>
        </div>
      </div>
    </div>
  );
}

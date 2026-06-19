export default function ExternalPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  if (error === "no-token" || error === "invalid-token") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-600">
            {error === "no-token" ? "Access Denied" : "Invalid or Expired Token"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {error === "no-token"
              ? "Missing access token. Please use the link from your email."
              : "Your access link is invalid or has expired. Please request a new one."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold">SCP Task Portal</h1>
        <p className="mt-2 text-sm text-gray-500">Please use the access link from your task email notification.</p>
      </div>
    </div>
  );
}
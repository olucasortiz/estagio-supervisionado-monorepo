import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-lion-red" />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}

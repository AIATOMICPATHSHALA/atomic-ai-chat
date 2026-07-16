import { Suspense } from "react";
import { ResetPasswordScreen } from "@/components/ResetPasswordScreen";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
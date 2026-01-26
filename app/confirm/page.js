import { redirect } from "next/navigation";

export default function ConfirmPage({ searchParams }) {
  const token = searchParams?.token || "";
  if (!token) {
    redirect("/bevestigd?status=missing");
  }
  const params = new URLSearchParams({ token });
  redirect(`/api/confirm?${params.toString()}`);
}

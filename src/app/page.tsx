import { redirect } from "next/navigation";

// Root "/" redirects to auth. Once InsForge auth is wired up,
// this will check the session and redirect to /dashboard if logged in.
export default function RootPage() {
  redirect("/auth");
}

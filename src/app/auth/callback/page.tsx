"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash   = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    // InsForge returns the auth code as "insforge_code"
    const code     = search.get("insforge_code") ?? hash.get("insforge_code") ?? "";
    const verifier = sessionStorage.getItem("loop_pkce_verifier") ?? "";

    if (!code) {
      setStatus("No authorization code received from InsForge.");
      return;
    }
    if (!verifier) {
      setStatus("Session expired — redirecting…");
      setTimeout(() => { window.location.href = "/auth"; }, 2000);
      return;
    }

    sessionStorage.removeItem("loop_pkce_verifier");
    setStatus("Almost there…");

    fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, codeVerifier: verifier }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus(`Sign-in failed: ${data.error}`);
          return;
        }
        window.location.href = data.hasGoals ? "/dashboard" : "/onboarding";
      })
      .catch((e) => setStatus(`Network error: ${e.message}`));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Logo size="lg" />
      <p className="text-sm text-[#6b6b8a] animate-pulse">{status}</p>
    </div>
  );
}

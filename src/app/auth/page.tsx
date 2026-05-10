"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Card, CardContent } from "@/components/ui/Card";

function generateVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const params = useSearchParams();
  const sessionExpired = params.get("reason") === "expired";

  useEffect(() => {
    // Clear stale cookies when redirected here due to expiry
    if (sessionExpired) {
      document.cookie = "loop_token=; Max-Age=0; path=/";
      document.cookie = "loop_user_id=; Max-Age=0; path=/";
      document.cookie = "loop_refresh_token=; Max-Age=0; path=/";
    }
  }, [sessionExpired]);

  const handleGoogle = async () => {
    setLoading(true);
    setError("");

    try {
      const verifier = generateVerifier();
      const challenge = await generateChallenge(verifier);
      sessionStorage.setItem("loop_pkce_verifier", verifier);

      const INSFORGE = process.env.NEXT_PUBLIC_INSFORGE_URL!;
      const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
      const callbackUrl = `${window.location.origin}/auth/callback`;

      const qs = new URLSearchParams({
        redirect_uri: callbackUrl,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });

      // Ask InsForge for the Google authUrl
      const res = await fetch(`${INSFORGE}/api/auth/oauth/google?${qs}`, {
        headers: { apikey: ANON_KEY },
      });

      const body = await res.json();

      if (!res.ok || !body.authUrl) {
        throw new Error(body.message ?? body.error ?? "InsForge did not return an authUrl");
      }

      // Redirect the browser to Google's sign-in
      window.location.href = body.authUrl;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        {sessionExpired && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 text-center">
            Your session expired — please sign in again to continue.
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#f0f0f5] mb-2">Welcome to Loop</h1>
          <p className="text-sm text-[#6b6b8a]">
            Your personal accountability agent for money, health, and habits.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {loading ? "Connecting to Google…" : "Continue with Google"}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-400 text-center break-words">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#6b6b8a] mt-6">
          By continuing, you agree to Loop&apos;s terms of service.
        </p>
      </div>
    </div>
  );
}

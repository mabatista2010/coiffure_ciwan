"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthDetails = {
  client?: {
    name?: string;
  };
  redirect_uri?: string;
  scopes?: string[];
};

type OAuthApi = {
  getAuthorizationDetails?: (authorizationId: string) => Promise<{ data?: AuthDetails; error?: { message?: string } }>
  approveAuthorization?: (authorizationId: string) => Promise<{ data?: { redirect_to?: string }; error?: { message?: string } }>
  denyAuthorization?: (authorizationId: string) => Promise<{ data?: { redirect_to?: string }; error?: { message?: string } }>
};

function OAuthConsentContent() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");

  const [authDetails, setAuthDetails] = useState<AuthDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAuthorization = useCallback(async () => {
    if (!authorizationId) {
      setErrorMessage("Parametre authorization_id manquant.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }

    const oauthApi = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
    if (!oauthApi?.getAuthorizationDetails) {
      setErrorMessage("OAuth n'est pas disponible pour le moment.");
      setLoading(false);
      return;
    }

    const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
    if (error || !data) {
      setErrorMessage(error?.message || "Requete d'autorisation invalide.");
      setLoading(false);
      return;
    }

    setAuthDetails(data);
    setNeedsLogin(false);
    setLoading(false);
  }, [authorizationId]);

  useEffect(() => {
    void loadAuthorization();
  }, [loadAuthorization]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message || "Impossible de se connecter.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    void loadAuthorization();
  };

  const handleDecision = async (decision: "approve" | "deny") => {
    if (!authorizationId) return;
    setSubmitting(true);
    setErrorMessage("");

    const oauthApi = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
    if (!oauthApi?.approveAuthorization || !oauthApi?.denyAuthorization) {
      setErrorMessage("OAuth n'est pas disponible pour le moment.");
      setSubmitting(false);
      return;
    }

    const result =
      decision === "approve"
        ? await oauthApi.approveAuthorization(authorizationId)
        : await oauthApi.denyAuthorization(authorizationId);

    if (result.error) {
      setErrorMessage(result.error.message || "Action impossible.");
      setSubmitting(false);
      return;
    }

    const redirectUrl =
      (result.data as { redirect_url?: string })?.redirect_url ||
      (result.data as { redirect_to?: string })?.redirect_to;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      setErrorMessage("Redirection introuvable.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-lg bg-secondary p-8 text-light shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-primary">Autorisation ChatGPT</h1>
          <p className="mt-2 text-sm text-gray-300">
            Confirmez l&apos;acces de l&apos;application a votre compte.
          </p>
        </div>

        {loading && (
          <div className="rounded-md bg-dark px-4 py-3 text-sm text-gray-200">
            Chargement...
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-md bg-red-100 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!loading && needsLogin && (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-gray-600 bg-dark px-3 py-2 text-sm text-light focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-gray-600 bg-dark px-3 py-2 text-sm text-light focus:border-primary focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-dark hover:bg-opacity-90 disabled:opacity-60"
            >
              {submitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        )}

        {!loading && authDetails && !needsLogin && (
          <div className="space-y-4">
            <div className="rounded-md bg-dark px-4 py-3 text-sm text-gray-200">
              <p>
                <span className="font-semibold">Application:</span>{" "}
                {authDetails.client?.name || "Application inconnue"}
              </p>
              {authDetails.redirect_uri && (
                <p className="mt-2 break-all text-xs text-gray-400">
                  Redirect: {authDetails.redirect_uri}
                </p>
              )}
            </div>

            {authDetails.scopes?.length ? (
              <div>
                <p className="text-sm font-semibold text-light">
                  Permissions demandees
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-gray-300">
                  {authDetails.scopes.map((scope) => (
                    <li key={scope}>{scope}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleDecision("approve")}
                disabled={submitting}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-dark hover:bg-opacity-90 disabled:opacity-60"
              >
                Autoriser
              </button>
              <button
                type="button"
                onClick={() => handleDecision("deny")}
                disabled={submitting}
                className="flex-1 rounded-md border border-gray-500 px-4 py-2 text-sm font-semibold text-light hover:border-gray-300 disabled:opacity-60"
              >
                Refuser
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-dark px-4 py-10 text-light">
          Chargement...
        </div>
      }
    >
      <OAuthConsentContent />
    </Suspense>
  );
}

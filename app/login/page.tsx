"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }
    router.push("/inbox");
    router.refresh();
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--wa-green-dark)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-1 text-2xl font-bold">Inteliar Inbox</h1>
        <p className="mb-6 text-sm text-gray-500">
          Inbox de WhatsApp Business · Inteliar Stack
        </p>

        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--wa-green)]"
        />

        <label className="mb-1 block text-sm font-medium">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[var(--wa-green)]"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--wa-green)] py-2 font-medium text-white hover:bg-[var(--wa-green-dark)] disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>

        <p className="mt-4 text-xs text-gray-400">
          Los usuarios se crean desde el panel de Supabase (Authentication → Users).
        </p>
      </form>
    </div>
  );
}

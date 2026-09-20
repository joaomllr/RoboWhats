import React, { useState } from "react";
import { LogIn, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface LoginPageProps {
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      setSubmitting(false);
    }
    // Em caso de sucesso o listener de sessão no App troca a tela sozinho.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-fluxi-cloud dark:bg-fluxi-graphite px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <img
            src="/logo/icon-rounded-512.png"
            alt="Fluxi"
            className="w-10 h-10 rounded-lg object-contain"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-fluxi-graphite dark:text-white">
              FLUXI
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fluxi-blue text-white uppercase tracking-wider">
              Bots
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-fluxi-graphiteLight rounded-2xl border border-slate-200 dark:border-fluxi-graphiteBorder p-6 shadow-sm"
        >
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            Entrar no painel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Acesse as conversas e os indicadores da sua empresa.
          </p>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            E-mail
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-xl border border-slate-200 dark:border-fluxi-graphiteBorder bg-white dark:bg-fluxi-graphite text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-fluxi-blue"
          />

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Senha
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-5 px-3 py-2 rounded-xl border border-slate-200 dark:border-fluxi-graphiteBorder bg-white dark:bg-fluxi-graphite text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-fluxi-blue"
          />

          {error && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-fluxi-coral/10 border border-fluxi-coral/30 text-fluxi-coral text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-fluxi-green text-white text-sm font-bold hover:brightness-95 transition disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? "Entrando..." : "Entrar"}</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full mt-3 px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-fluxi-graphite transition"
          >
            Voltar para a landing
          </button>
        </form>
      </div>
    </div>
  );
};

export const dynamic = "force-dynamic";

import SetupForm from "@/components/auth/SetupForm";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <div className="text-lg font-extrabold tracking-tight text-navy mb-4">Better<span className="text-cyan">Control</span></div>
        {token ? (
          <SetupForm token={token} />
        ) : (
          <p className="text-sm text-gray-500">Convite inválido. Peça um novo link de convite a um administrador.</p>
        )}
      </div>
    </div>
  );
}

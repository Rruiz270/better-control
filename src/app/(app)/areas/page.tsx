export const dynamic = "force-dynamic";

import { getDashboardStats } from "@/lib/actions/areas";
import { AreaRow } from "@/components/dashboard/AreaHighlightCard";
import Header from "@/components/layout/Header";

export default async function AreasPage() {
  const areas = await getDashboardStats();

  return (
    <div className="min-h-screen">
      <Header title="Áreas" />

      <div className="mx-auto max-w-5xl space-y-2.5 px-4 py-8 md:px-6 md:py-10">
        {areas.map((area, i) => (
          <AreaRow key={area.id} area={area} index={i} />
        ))}
        {areas.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            Nenhuma área para exibir.
          </p>
        )}
      </div>
    </div>
  );
}

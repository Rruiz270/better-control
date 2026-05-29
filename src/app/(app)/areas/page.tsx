import { getDashboardStats } from "@/lib/actions/areas";
import AreaHighlightCard from "@/components/dashboard/AreaHighlightCard";
import Header from "@/components/layout/Header";

export default async function AreasPage() {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen">
      <Header title="Areas de Negocio" />
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.map((area) => (
            <AreaHighlightCard key={area.id} area={area} />
          ))}
        </div>
      </div>
    </div>
  );
}

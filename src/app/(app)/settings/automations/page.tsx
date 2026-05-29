export const dynamic = "force-dynamic";

import { getAutomationRules } from "@/lib/actions/automations";
import Header from "@/components/layout/Header";
import AutomationsList from "@/components/automations/AutomationsList";

export default async function AutomationsPage() {
  const rules = await getAutomationRules();

  return (
    <div className="min-h-screen">
      <Header title="Automacoes" />
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <AutomationsList initialRules={rules} />
      </div>
    </div>
  );
}

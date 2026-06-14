"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function AreaSelector({
  areas,
  current,
}: {
  areas: { slug: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("area", slug);
    } else {
      params.delete("area");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-cyan/40"
    >
      <option value="">Todas as áreas</option>
      {areas.map((a) => (
        <option key={a.slug} value={a.slug}>
          {a.name}
        </option>
      ))}
    </select>
  );
}

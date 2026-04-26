import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { findUnit } from "@/lib/course";
import { UnitPageClient } from "./unit-client";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitSlug: string }>;
}) {
  const { unitSlug } = await params;
  const unit = findUnit(unitSlug);
  if (!unit) notFound();
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link href="/learn" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> All units
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="text-sm text-muted-foreground">{unit.blurb}</p>
      </header>
      <UnitPageClient unit={unit} />
    </div>
  );
}

import { AreaDetailView } from "@/features/areas/components/AreaDetailView";

export default async function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AreaDetailView areaId={id} />;
}

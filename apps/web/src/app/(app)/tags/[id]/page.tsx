import { TagDetailView } from "@/features/tags/components/TagDetailView";

export default async function TagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TagDetailView tagId={id} />;
}

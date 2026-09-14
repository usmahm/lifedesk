import { ProjectDetailView } from "@/features/projects/components/ProjectDetailView";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}

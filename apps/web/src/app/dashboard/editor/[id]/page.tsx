import { EditorPage } from '@/components/dashboard/EditorPage';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ publication?: string }> };
export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { publication } = await searchParams;
  return <EditorPage postId={id === 'new' ? null : id} publicationSlug={publication ?? ''} />;
}

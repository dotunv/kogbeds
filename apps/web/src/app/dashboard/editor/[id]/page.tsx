import { EditorPage } from '@/components/dashboard/EditorPage';
type Props = { params: Promise<{ id: string }> };
export default async function Page({ params }: Props) {
  const { id } = await params;
  return <EditorPage postId={id === 'new' ? null : id} />;
}

import { CommentsPage } from '@/components/dashboard/CommentsPage';

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <CommentsPage pubSlug={slug} />;
}

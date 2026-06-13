import { PostsListPage } from '@/components/dashboard/PostsListPage';

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PostsListPage pubSlug={slug} />;
}

import { SinglePostPage } from '@/components/pages/SinglePostPage';

type Props = { params: Promise<{ username: string; slug: string }> };

export default async function Page({ params }: Props) {
  const { username, slug } = await params;
  return <SinglePostPage username={username} slug={slug} />;
}

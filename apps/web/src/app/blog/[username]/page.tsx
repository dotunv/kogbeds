import { BlogHomePage } from '@/components/pages/BlogHomePage';

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tag?: string; page?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const { username } = await params;
  const { tag, page } = await searchParams;
  return <BlogHomePage username={username} tag={tag} page={Number(page ?? 1)} />;
}

import { SubscribersPage } from '@/components/dashboard/SubscribersPage';

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <SubscribersPage pubSlug={slug} />;
}

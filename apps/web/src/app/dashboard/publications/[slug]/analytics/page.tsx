import { AnalyticsDashboardPage } from '@/components/dashboard/AnalyticsDashboardPage';

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <AnalyticsDashboardPage pubSlug={slug} />;
}

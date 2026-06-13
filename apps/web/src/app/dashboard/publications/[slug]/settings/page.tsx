import { PublicationSettingsPage } from '@/components/dashboard/PublicationSettingsPage';

type Props = { params: Promise<{ slug: string }> };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PublicationSettingsPage pubSlug={slug} />;
}

import { EbookEditorPage } from '@/components/dashboard/EbookEditorPage';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EbookEditorPage paramsPromise={params} />;
}

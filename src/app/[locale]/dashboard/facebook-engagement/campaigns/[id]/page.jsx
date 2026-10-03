import CampaignDetail from '@/components/facebook-engagement/CampaignDetail';

export default async function FacebookCampaignPage({ params }) {
	const { id } = await params;
	return <CampaignDetail id={id} />;
}

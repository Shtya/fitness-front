import FbShell from '@/components/facebook-engagement/FbShell';

export const metadata = {
	title: 'Facebook Engagement | So7baFit',
};

export default function FacebookEngagementLayout({ children }) {
	return <FbShell>{children}</FbShell>;
}

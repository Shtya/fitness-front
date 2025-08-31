import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { Container } from '@/components/site/UI';


export default function SiteLayout({ children }){
return (
<div className="min-h-dvh flex flex-col bg-gradient-to-b from-white to-slate-50">
<SiteHeader />
<main className="flex-1">{children}</main>
<SiteFooter />
</div>
);
}
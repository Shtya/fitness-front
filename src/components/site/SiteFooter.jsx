import Link from 'next/link';
import { Container } from './UI';


export default function SiteFooter(){
return (
<footer className="mt-20 border-t border-slate-200 bg-white">
<Container className="py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
<div>
<div className="font-semibold">Amazing Gym</div>
<p className="text-slate-600 mt-2">Stronger, healthier, happier. Cairo.</p>
</div>
<div>
<div className="font-semibold">Explore</div>
<ul className="mt-2 space-y-1">
<li><Link href="/programs" className="hover:underline">Programs</Link></li>
<li><Link href="/schedule" className="hover:underline">Schedule</Link></li>
<li><Link href="/pricing" className="hover:underline">Pricing</Link></li>
<li><Link href="/coaches" className="hover:underline">Coaches</Link></li>
</ul>
</div>
<div>
<div className="font-semibold">Company</div>
<ul className="mt-2 space-y-1">
<li><a href="#" className="hover:underline">About</a></li>
<li><a href="#" className="hover:underline">Contact</a></li>
<li><a href="#" className="hover:underline">Privacy</a></li>
</ul>
</div>
<div>
<div className="font-semibold">Get the app</div>
<div className="mt-2 flex gap-2">
<div className="h-10 w-28 rounded-lg bg-slate-200" />
<div className="h-10 w-28 rounded-lg bg-slate-200" />
</div>
</div>
</Container>
<div className="text-xs text-slate-500 text-center py-4">© {new Date().getFullYear()} Amazing Gym. All rights reserved.</div>
</footer>
);
}
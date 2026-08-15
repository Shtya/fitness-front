export function GET() {
	return new Response('google-site-verification: google62432cad2b17f9f3.html\n', {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'public, max-age=0, must-revalidate',
		},
	});
}

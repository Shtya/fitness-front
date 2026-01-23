import { useEffect, useState } from 'react';

const InstallButton = () => {
	const [deferredPrompt, setDeferredPrompt] = useState(null);
	const [isInstallable, setIsInstallable] = useState(false);

	useEffect(() => {
		const handleBeforeInstallPrompt = (e) => {
			e.preventDefault();
			setDeferredPrompt(e);
			setIsInstallable(true);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
	}, []);

	const handleInstallClick = async () => {
		if (deferredPrompt) {
			(deferredPrompt).prompt();
			const { outcome } = await (deferredPrompt).userChoice;
			setDeferredPrompt(null);
			setIsInstallable(false);
			console.log(`User response to the install prompt: ${outcome}`);
		}
	};

	return (
		<>
			{isInstallable && (
				<button onClick={handleInstallClick} className="install-button">
					Install App
				</button>
			)}
		</>
	);
};

export default InstallButton;
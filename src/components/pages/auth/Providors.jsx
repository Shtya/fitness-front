import { useSearchParams } from 'next/navigation';
import { SocialButton } from './SocialButton';


export const ContinueWithGoogleButton = ({ referralCode }) => {
  const redirectUrl = "http://localhost:3000"; // Hardcoded or dynamically set based on your needs.

  const handleGoogleLogin = async () => {
    let url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/google`;
    const params = new URLSearchParams();
    
    // Append the necessary parameters (redirect and referral code) to the URL.
    if (redirectUrl) params.append('redirect', redirectUrl);
    if (referralCode) params.append('ref', referralCode);
    
    // Append the query parameters to the URL if present.
    if (params.toString()) url += `?${params.toString()}`;

    try {
      const response = await fetch(url); // Send the request to the backend to get the Google OAuth URL.
      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
			console.log(data.redirectUrl);
        //   window.location.href = data.redirectUrl;
        } else {
          console.error('No redirect URL found in response.');
        }
      } else {
        console.error('Failed to fetch Google OAuth URL.');
      }
    } catch (error) {
      console.error('Error fetching Google OAuth URL:', error);
    }
  };

  return (
    <SocialButton 
      icon='/images/google-icon.png' 
      text='Continue with Google' 
      onClick={handleGoogleLogin} 
    />
  );
};


export const ContinueWithAppleButton = ({ redirectUrl, referralCode }) => {
  const handleAppleLogin = async () => {
    let url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/apple`;
    const params = new URLSearchParams();
    if (redirectUrl) params.append('redirect', redirectUrl);
    if (referralCode) params.append('ref', referralCode);
    if (params.toString()) url += `?${params.toString()}`;

    try {
      // Send a GET request to the backend to generate the Apple OAuth URL
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirectUrl;
      } else {
        console.error('Failed to fetch Apple OAuth URL.');
      }
    } catch (error) {
      console.error('Error fetching Apple OAuth URL:', error);
    }
  };

  return <SocialButton icon='/images/apple-icon.png' text='Continue with Apple' onClick={handleAppleLogin} />;
};

export const ContinueWithEmailButton = ({ onClick }) => <SocialButton icon='/images/gmail-icon.png' text='Continue with Email' onClick={onClick} />;

export const ContinueWithPhoneButton = ({ onClick }) => <SocialButton icon='/images/phone-icon.png' text='Continue with Phone' onClick={onClick} />;

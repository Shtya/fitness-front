import { motion } from 'framer-motion';

export default function TitleByTab({ activeTab, view }) {
  const TITLES = {
    login: {
      options: {
        title: 'Sign in to your account',
        subtitle: 'Choose a method to continue',
      },
      email: {
        title: 'Sign in with Email',
        subtitle: 'Enter your email and password',
      },
      phone: {
        title: 'Sign in with Phone',
        subtitle: 'Enter your phone number to receive a code',
      },
      otp: {
        title: 'Verify your code',
        subtitle: 'Enter the 6-digit code we sent you',
      },
    },
    register: {
      options: {
        title: 'Create your account',
        subtitle: 'Choose a method to get started',
      },
      email: {
        title: 'Create account with Email',
        subtitle: 'Fill in your details to sign up',
      },
      phone: {
        title: 'Create account with Phone',
        subtitle: 'We’ll send you a verification code',
      },
      otp: {
        title: 'Verify your email',
        subtitle: 'Enter the code to activate your account',
      },
    },
    'forgot-password': {
      email: {
        title: 'Forgot your password',
        subtitle: 'Enter your email to receive a reset code',
      },
      otp: {
        title: 'Verify your identity',
        subtitle: 'Enter the code we sent to reset your password',
      },
    },
    'reset-password': {
      email: {
        title: 'Set a new password',
        subtitle: 'Use at least 8 characters with letters & numbers',
      },
    },
  };

   const tabData = TITLES[activeTab] ?? TITLES.login;
  const content = tabData[view] ?? tabData.options ?? { title: '', subtitle: '' };

  return (
    <motion.div key={`${activeTab}-${view}`} className='mb-6 text-center md:text-left'>
      <h1 className=' text-center mt-2 text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm'>{content.title}</h1>
      {content.subtitle && <p className=' text-center mt-1 text-base text-gray-600 leading-relaxed'>{content.subtitle}</p>}
    </motion.div>
  );
}

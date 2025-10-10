import toast from 'react-hot-toast';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const colors = {
  success: {
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    text: '#065f46',
    icon: <CheckCircle className='w-5 h-5 text-emerald-600' />,
  },
  error: {
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    text: '#991b1b',
    icon: <XCircle className='w-5 h-5 text-rose-600' />,
  },
  warning: {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    text: '#92400e',
    icon: <AlertTriangle className='w-5 h-5 text-amber-600' />,
  },
  info: {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    text: '#1e40af',
    icon: <Info className='w-5 h-5 text-blue-600' />,
  },
};

const config = type => ({
  position: 'top-center',
  duration: 3500,
  style: {
    background: colors[type]?.bg || '#ffffff',
    color: colors[type]?.text || '#111827',
    boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05)',
    borderRadius: '14px',
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '-0.01em',
  },
  icon: colors[type]?.icon,
  iconTheme: {
    primary: colors[type]?.text,
    secondary: '#fff',
  },
});

export function Notification(msg, type = 'info') {
  switch (type) {
    case 'success':
      toast.success(msg, config('success'));
      break;
    case 'error':
      toast.error(msg, config('error'));
      break;
    case 'warning':
      toast(msg, config('warning'));
      break;
    default:
      toast(msg, config('info'));
      break;
  }
}

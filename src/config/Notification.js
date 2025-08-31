import toast from 'react-hot-toast';

const config = (type) => ({
  className : "toast-config",
  position: 'top-center',
  duration: 3000,
});

export function Notification(msg, type) {
  if (type === 'success') {
    toast.success(msg, config('success'));
  } else {
    toast.error(msg, config('error'));
  }
}

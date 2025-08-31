import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownWrapper } from '../molecules/Header';
import { useTranslations } from 'next-intl';
import { notificationService } from '@/services/notificationService';
import { toast } from 'react-hot-toast';
import { Link } from '@/i18n/navigation';
import { MoveRight } from 'lucide-react';

export const getLink = (relatedEntityType, relatedEntityId) => {
  if (relatedEntityType === 'proposal') {
    return `/my-jobs/${relatedEntityId}/proposals`; // Proposal link
  } else if (relatedEntityType === 'order') {
    return `/my-jobs/${relatedEntityId}/orders`; // Order link (adjust this route as necessary)
  } else {
    return null; // Return null if no matching type is found
  }
};

const NotificationPopup = () => {
  const t = useTranslations('layout');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [isOpen]);

  useEffect(() => {
    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      setNotifications(response.data.records || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.total_records || 0);
    } catch (error) {
      // console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAsRead = async notificationId => {
    try {
      await notificationService.markAsRead(notificationId);
      // Update local state
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const formatTime = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const getNotificationIcon = type => {
    switch (type) {
      case 'message':
        return '/icons/message.svg';
      case 'order':
        return '/icons/shopping-bag.svg';
      case 'system':
        return '/icons/system.svg';
      case 'promotion':
        return '/icons/discount.svg';
      default:
        return '/icons/notification.svg';
    }
  };

  return (
    <div className='relative'>
      <motion.span initial={{ scale: 0 }} animate={{ scale: unreadCount > 0 ? 1 : 0 }} className='ring-[3px] right-white flex items-center justify-center text-[12px] text-white z-[10] absolute bg-[#D81F22] rounded-full w-5 h-5 top-[-8px] right-[-5px]'>
        {unreadCount > 9 ? '9+' : unreadCount}
      </motion.span>

      <DropdownWrapper iconSrc='/icons/notification.svg' title={t('notificationsTitle')} setOpen={setIsOpen}>
        <div className='w-full max-h-96 overflow-y-auto'>
          <div className='flex items-center justify-between py-4 border-b border-gray-200'>
            <h3 className='text-lg font-semibold text-gray-900'>{t('notificationsTitle')}</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className='text-sm text-blue-600 hover:text-blue-800 font-medium'>
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <div className='p-4 space-y-3'>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className='animate-pulse flex space-x-3'>
                  <div className='rounded-full bg-gray-200 h-10 w-10'></div>
                  <div className='flex-1 space-y-2'>
                    <div className='h-4 bg-gray-200 rounded'></div>
                    <div className='h-3 bg-gray-200 rounded w-5/6'></div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className='p-6 text-center'>
              <img src='/icons/empty-notifications.svg' alt='No notifications' className='mx-auto w-16 h-16 opacity-50 mb-3' />
              <p className='text-gray-500 text-sm'>{t('notificationsPlaceholder')}</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-100'>
              <AnimatePresence>
                {notifications.map(notification => (
                  <motion.div key={notification.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`} onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}>
                    <div className='flex gap-3'>
                      <div className='flex-shrink-0'>
                        <img src={getNotificationIcon(notification.type)} alt={notification.type} className='w-8 h-8 rounded-full bg-blue-100 p-1.5' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>{notification.title}</p>
                        <p className='text-sm text-gray-600 mt-1'>{notification.message}</p>
                        <div className='flex items-center justify-between mt-2'>
                          <span className='text-xs text-gray-500'>{formatTime(notification.created_at)}</span>
                          {!notification.isRead && <span className='flex-none inline-block w-2 h-2 rounded-full bg-blue-500'></span>}
                        </div>

                        {getLink(notification.relatedEntityType, notification.relatedEntityId) && (
                          <div className='mt-3'>
                            <Link href={getLink(notification.relatedEntityType, notification.relatedEntityId)} className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-300 ease-in-out shadow-sm cursor-pointer'>
                              <span className='text-xs'>{notification.relatedEntityType === 'proposal' ? 'View Proposal' : 'View Order'}</span>
                              <span className='text-blue-600 text-sm'> <MoveRight size={16} /> </span>  
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {notifications.length > 0 && (
            <div className='p-3 border-t border-gray-200'>
              <button
                className='w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium'
                onClick={() => {
                  // Navigate to full notifications page
                  window.location.href = '/notifications';
                }}>
                View all notifications
              </button>
            </div>
          )}
        </div>
      </DropdownWrapper>
    </div>
  );
};

export default NotificationPopup;

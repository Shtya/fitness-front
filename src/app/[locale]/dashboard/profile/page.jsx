"use client" ///settings/profile.js
import { useState } from 'react';
import FloatingInput from '@/components/atoms/FloatingInput';
import FloatingSelect from '@/components/atoms/FloatingSelect';

export default function ProfileSettings() {
  const [userData, setUserData] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    height: 180,
    weight: 76,
    age: 32,
    gender: 'male',
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
  });

  const handleSubmit = e => {
    e.preventDefault(); 
  };

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      // Handle nested notification settings
      const [parent, child] = name.split('.');
      setUserData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: checked,
        },
      }));
    } else {
      setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div>
      <h1 className='text-3xl font-bold text-gray-800 mb-6'>Profile Settings</h1>

      <div className='bg-white rounded-lg shadow p-6'>
        <form onSubmit={handleSubmit}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
            <FloatingInput label="Full Name" value={userData.name} onChange={(v) => setUserData((p) => ({ ...p, name: v }))} />
            <FloatingInput label="Email Address" type="email" value={userData.email} onChange={(v) => setUserData((p) => ({ ...p, email: v }))} />
            <FloatingInput label="Phone Number" type="tel" value={userData.phone} onChange={(v) => setUserData((p) => ({ ...p, phone: v }))} />
            <FloatingInput label="Age" type="number" value={userData.age} onChange={(v) => setUserData((p) => ({ ...p, age: v }))} />
            <FloatingInput label="Height (cm)" type="number" value={userData.height} onChange={(v) => setUserData((p) => ({ ...p, height: v }))} />
            <FloatingInput label="Weight (kg)" type="number" value={userData.weight} onChange={(v) => setUserData((p) => ({ ...p, weight: v }))} />
            <FloatingSelect
              label="Gender"
              value={userData.gender}
              onChange={(v) => setUserData((p) => ({ ...p, gender: v }))}
              options={[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
                { id: 'other', label: 'Other' },
              ]}
            />
          </div>

          <div className='mb-6'>
            <h3 className='text-lg font-semibold mb-4'>Notification Preferences</h3>
            <div className='space-y-2'>
              <label className='flex items-center'>
                <input type='checkbox' name='notifications.email' checked={userData.notifications.email} onChange={handleInputChange} className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded' />
                <span className='ml-2 text-sm text-gray-700'>Email Notifications</span>
              </label>

              <label className='flex items-center'>
                <input type='checkbox' name='notifications.push' checked={userData.notifications.push} onChange={handleInputChange} className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded' />
                <span className='ml-2 text-sm text-gray-700'>Push Notifications</span>
              </label>

              <label className='flex items-center'>
                <input type='checkbox' name='notifications.sms' checked={userData.notifications.sms} onChange={handleInputChange} className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded' />
                <span className='ml-2 text-sm text-gray-700'>SMS Notifications</span>
              </label>
            </div>
          </div>

          <div className='flex justify-between'>
            <button type='button' className='bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition'>
              Cancel
            </button>
            <button type='submit' className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition'>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

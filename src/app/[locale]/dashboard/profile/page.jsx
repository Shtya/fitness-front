"use client" ///settings/profile.js
import { useState } from 'react';

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
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Full Name</label>
              <input type='text' name='name' value={userData.name} onChange={handleInputChange} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Email Address</label>
              <input type='email' name='email' value={userData.email} onChange={handleInputChange} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Phone Number</label>
              <input type='tel' name='phone' value={userData.phone} onChange={handleInputChange} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Age</label>
              <input type='number' name='age' value={userData.age} onChange={handleInputChange} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Height (cm)</label>
              <input type='number' name='height' value={userData.height} onChange={handleInputChange} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Weight (kg)</label>
              <input type='number' name='weight' value={userData.weight} onChange={handleInputChange} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' step='0.1' />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Gender</label>
              <select name='gender' value={userData.gender} onChange={handleInputChange} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>
                <option value='male'>Male</option>
                <option value='female'>Female</option>
                <option value='other'>Other</option>
              </select>
            </div>
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

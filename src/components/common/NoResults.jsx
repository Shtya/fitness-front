import React from 'react';
import Link from 'next/link';

const NoResults = ({ mainText, additionalText, buttonText, buttonLink , onClick }) => {
  return (
    <div className='text-center col-span-10 opacity-80 '>
      {/* Icon */}
      <div className='text-6xl text-gray-400 mb-2'>
        <img src='/icons/empty.jpg' alt='No Data' className='mx-auto w-[200px] transform transition duration-500 hover:scale-105' />
      </div>

      <p className='text-3xl font-extrabold text-gray-800 mb-2'>{mainText || 'Oops! No jobs found.'}</p>

      <p className='text-lg text-gray-600 mb-8 max-w-[550px] w-full mx-auto '>{additionalText || 'It looks like you haven’t posted any jobs yet. Start by creating your first job today.'}</p>

      {buttonLink && (
        <Link href={buttonLink} className='px-5 py-2 rounded-lg bg-slate-800 text-white text-base cursor-pointer font-medium hover:bg-slate-700 transition'>
          {buttonText || 'Create Your First Job'}
        </Link>
      )}
      {onClick && (
        <button onClick={onClick} className='px-5 py-2 rounded-lg bg-slate-800 text-white text-base cursor-pointer font-medium hover:bg-slate-700 transition'>
          {buttonText || 'Create Your First Job'}
        </button>
      )}
    </div>
  );
};

export default NoResults;

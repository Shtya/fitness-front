"use client"
import React, { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const ConfigAos = () => {
  useEffect(() => {
    AOS.init({
      duration: 800, // animation duration
      once: true, // whether animation should happen only once
      offset: 100, // offset (in px) from the original trigger point
    });
  }, []);
  return null;
};

export default ConfigAos;

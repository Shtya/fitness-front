'use client';

 import { createContext, useContext, useEffect, useState } from 'react';
const GlobalContext = createContext();

// Provider Component
export const GlobalProvider = ({ children }) => {
   

  return <GlobalContext.Provider value={{   }}>{children}</GlobalContext.Provider>;
};

export const useValues = () => {
  return useContext(GlobalContext);
};

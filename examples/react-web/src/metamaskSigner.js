import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserProvider } from 'ethers';

const MetaMaskContext = createContext();

export const MetaMaskProvider = ({ children }) => {
  const [signer, setSigner] = useState(null);

  useEffect(() => {
    async function fetchSigner() {
      if (!window.ethereum) {
        alert('Please install MetaMask to play this game');
        return;
      }
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setSigner(signer);
    }
    fetchSigner();
  }, []);

  return (
    <MetaMaskContext.Provider value={signer}>
      {children}
    </MetaMaskContext.Provider>
  );
};

export const useMetaMask = () => {
  return useContext(MetaMaskContext);
};

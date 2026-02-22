'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';

const ARC_TESTNET_CHAIN = {
    id: 5042002,
    name: 'ARC Testnet',
    network: 'arc-testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://arc-testnet.g.alchemy.com/v2/FNzJDOWKoN8fHNgIwXZIdghzqJvpaIKR'] },
    },
    blockExplorers: {
        default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
    },
};

interface WalletContextType {
    address: string | null;
    signer: ethers.Signer | null;
    provider: ethers.BrowserProvider | null;
    isConnected: boolean;
    isConnecting: boolean;
    chainId: number | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType>({
    address: null,
    signer: null,
    provider: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    connect: async () => { },
    disconnect: () => { },
    signMessage: async () => '',
});

export function useWallet() {
    return useContext(WalletContext);
}

function WalletBridge({ children }: { children: React.ReactNode }) {
    const { login, logout, authenticated, ready } = usePrivy();
    const { wallets } = useWallets();

    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);

    const activeWallet = wallets[0] || null;
    const address = activeWallet?.address || null;
    const isConnected = authenticated && !!address;
    const isConnecting = !ready;

    // Initialize signer when wallet is available
    useEffect(() => {
        let cancelled = false;

        async function initSigner() {
            if (!activeWallet || !authenticated) {
                setSigner(null);
                setProvider(null);
                setChainId(null);
                return;
            }

            try {
                const ethProvider = await activeWallet.getEthereumProvider();

                // Switch to ARC testnet
                try {
                    await ethProvider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: `0x${(5042002).toString(16)}` }],
                    });
                } catch (switchErr: any) {
                    if (switchErr.code === 4902) {
                        await ethProvider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: `0x${(5042002).toString(16)}`,
                                chainName: 'ARC Testnet',
                                nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                                rpcUrls: ['https://arc-testnet.g.alchemy.com/v2/FNzJDOWKoN8fHNgIwXZIdghzqJvpaIKR'],
                                blockExplorerUrls: ['https://testnet.arcscan.app/'],
                            }],
                        });
                    }
                }

                if (cancelled) return;

                const browserProvider = new ethers.BrowserProvider(ethProvider);
                const walletSigner = await browserProvider.getSigner();
                const network = await browserProvider.getNetwork();

                if (cancelled) return;

                setProvider(browserProvider);
                setSigner(walletSigner);
                setChainId(Number(network.chainId));
            } catch (err) {
                console.error('Failed to init signer:', err);
                if (!cancelled) {
                    setSigner(null);
                    setProvider(null);
                }
            }
        }

        initSigner();
        return () => { cancelled = true; };
    }, [activeWallet, authenticated]);

    const connect = useCallback(async () => {
        login();
    }, [login]);

    const disconnect = useCallback(() => {
        logout();
        setSigner(null);
        setProvider(null);
        setChainId(null);
    }, [logout]);

    const signMessage = useCallback(async (message: string): Promise<string> => {
        if (!signer) throw new Error('Wallet not connected');
        return signer.signMessage(message);
    }, [signer]);

    return (
        <WalletContext.Provider value={{
            address,
            signer,
            provider,
            isConnected,
            isConnecting,
            chainId,
            connect,
            disconnect,
            signMessage,
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId="cmluvngt300100cl96jfy3ve6"
            config={{
                appearance: {
                    theme: 'dark',
                    accentColor: '#3b82f6',
                },
                loginMethods: ['wallet'],
                defaultChain: ARC_TESTNET_CHAIN as any,
                supportedChains: [ARC_TESTNET_CHAIN as any],
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                    },
                },



            }}
        >
            <WalletBridge>{children}</WalletBridge>
        </PrivyProvider>
    );
}

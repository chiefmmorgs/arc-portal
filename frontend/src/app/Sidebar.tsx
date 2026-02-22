'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletProvider, useWallet } from '@/lib/wallet';

function WalletButton() {
    const { address, isConnected, isConnecting, chainId, connect, disconnect } = useWallet();

    if (isConnected && address) {
        return (
            <div style={{ padding: '0 12px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px',
                    background: '#141420', border: '1px solid #1e1e2e',
                }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.4)', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#ededed', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#52525b', marginTop: 2 }}>
                            Chain {chainId}
                        </div>
                    </div>
                </div>
                <button
                    onClick={disconnect}
                    style={{
                        width: '100%', marginTop: 8, padding: '7px', background: 'transparent',
                        border: '1px solid #1e1e2e', borderRadius: 6, color: '#71717a',
                        cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#52525b'; e.currentTarget.style.color = '#ededed'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#71717a'; }}
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 12px' }}>
            <button
                onClick={connect} disabled={isConnecting}
                style={{
                    width: '100%', padding: '9px 16px', background: '#ededed', color: '#09090b',
                    border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500,
                    cursor: isConnecting ? 'not-allowed' : 'pointer', opacity: isConnecting ? 0.6 : 1,
                    fontFamily: 'Inter, sans-serif', transition: 'opacity 0.2s',
                }}
            >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
        </div>
    );
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'Dashboard', icon: '⊞' },
        { href: '/deploy', label: 'Deploy', icon: '▸' },
        { href: '/nft-studio', label: 'NFT Studio', icon: '◆' },
        { href: '/my-nfts', label: 'My NFTs', icon: '▦' },
        { href: '/analytics', label: 'Analytics', icon: '⊡' },
    ];

    return (
        <WalletProvider>
            <div style={{ display: 'flex', minHeight: '100vh', background: '#050508' }}>
                {/* Sidebar */}
                <aside style={{
                    width: '240px', background: '#050508',
                    borderRight: '1px solid #1e1e2e',
                    padding: '24px 0', display: 'flex', flexDirection: 'column', flexShrink: 0,
                }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px', marginBottom: '36px' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ededed' }} />
                        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ededed', letterSpacing: '-0.02em' }}>ARC Portal</span>
                    </div>

                    {/* Nav Links — each with its own bordered area */}
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 12px' }}>
                        {links.map(link => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '11px 14px', borderRadius: '8px',
                                        textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500,
                                        color: isActive ? '#ededed' : '#71717a',
                                        background: isActive ? '#141420' : 'transparent',
                                        border: isActive ? '1px solid #1e1e2e' : '1px solid transparent',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = '#0e0e18';
                                            e.currentTarget.style.color = '#a1a1aa';
                                            e.currentTarget.style.borderColor = '#1e1e2e';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = '#71717a';
                                            e.currentTarget.style.borderColor = 'transparent';
                                        }
                                    }}
                                >
                                    <span style={{ fontSize: '0.85rem', width: '18px', textAlign: 'center', opacity: isActive ? 1 : 0.6 }}>{link.icon}</span>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Bottom */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <WalletButton />
                        <div style={{ padding: '12px 20px', fontSize: '0.7rem', color: '#3f3f46', borderTop: '1px solid #1e1e2e' }}>
                            <p style={{ margin: '0 0 2px 0' }}>ARC Testnet</p>
                            <p style={{ margin: 0, fontFamily: 'monospace' }}>Chain ID: 5042002</p>
                        </div>
                    </div>
                </aside>

                {/* Main */}
                <main style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#050508' }}>
                    {children}
                </main>
            </div>
        </WalletProvider>
    );
}

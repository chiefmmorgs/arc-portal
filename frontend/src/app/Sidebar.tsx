'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { WalletProvider, useWallet } from '@/lib/wallet';

function WalletButton() {
    const { address, isConnected, isConnecting, chainId, connect, disconnect } = useWallet();

    if (isConnected && address) {
        return (
            <div style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div className="status-dot status-dot-live" />
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>Chain {chainId}</div>
                    </div>
                </div>
                <button onClick={disconnect} className="btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: '0.78rem', padding: '8px' }}>
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 16px' }}>
            <button onClick={connect} disabled={isConnecting} className="btn btn-primary"
                style={{ width: '100%', padding: '11px 16px', fontSize: '0.85rem', opacity: isConnecting ? 0.6 : 1 }}>
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
        </div>
    );
}

const links = [
    { href: '/', label: 'Dashboard', icon: '◎' },
    { href: '/deploy', label: 'Deploy', icon: '▲' },
    { href: '/nft-studio', label: 'NFT Studio', icon: '◆' },
    { href: '/my-nfts', label: 'My NFTs', icon: '❖' },
    { href: '/analytics', label: 'Analytics', icon: '◫' },
];

const accentColors = ['var(--green)', 'var(--orange)', 'var(--pink)', 'var(--lilac)', 'var(--blue)'];

export default function Sidebar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <WalletProvider>
            <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-deep)' }}>
                <aside style={{
                    width: 260, background: 'var(--bg-deep)',
                    borderRight: '1px solid var(--border)',
                    padding: '28px 0', display: 'flex', flexDirection: 'column', flexShrink: 0,
                    position: 'relative', overflow: 'hidden',
                }}>
                    <div className="orb orb-lilac" style={{ width: 200, height: 200, top: -80, left: -80 }} />

                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', marginBottom: 40, position: 'relative' }}>
                        <Image src="/arc-logo.png" alt="ARC Portal" width={36} height={36} style={{ objectFit: 'contain' }} />
                        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>ARC Portal</span>
                        <span className="chip chip-lilac" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>testnet</span>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
                        {links.map((link, i) => {
                            const isActive = pathname === link.href;
                            const accent = accentColors[i];
                            return (
                                <Link key={link.href} href={link.href}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 16px', textDecoration: 'none',
                                        fontSize: '0.88rem', fontWeight: 500,
                                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        background: isActive ? 'var(--bg-surface)' : 'transparent',
                                        border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                                        transition: 'all 0.2s ease', position: 'relative',
                                    }}>
                                    {isActive && (
                                        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: accent, boxShadow: `0 0 8px ${accent}` }} />
                                    )}
                                    <span style={{ fontSize: '1rem', width: 22, textAlign: 'center', color: isActive ? accent : 'var(--text-muted)', transition: 'color 0.2s ease' }}>{link.icon}</span>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <WalletButton />
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <div className="status-dot status-dot-live" />
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ARC Testnet</span>
                            </div>
                            <p style={{ margin: 0, fontFamily: 'Space Grotesk, monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>Chain ID: 5042002</p>
                        </div>
                    </div>
                </aside>
                <main style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--bg-deep)', position: 'relative' }}>{children}</main>
            </div>
        </WalletProvider>
    );
}
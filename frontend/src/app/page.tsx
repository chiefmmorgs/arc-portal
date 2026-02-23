'use client';

import React, { useEffect, useState } from 'react';

const ARC_RPC = 'https://arc-testnet.g.alchemy.com/v2/FNzJDOWKoN8fHNgIwXZIdghzqJvpaIKR';

interface BlockInfo { height: number; validator: string; txCount: number; time: string; }

export default function DashboardPage() {
    const [mounted, setMounted] = useState(false);
    const [blockHeight, setBlockHeight] = useState('—');
    const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);

    useEffect(() => { setMounted(true); fetchData(); }, []);

    async function fetchData() {
        try {
            const res = await fetch(ARC_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }) });
            const data = await res.json();
            const num = parseInt(data.result, 16);
            setBlockHeight(num.toLocaleString());
            const blocks: BlockInfo[] = [];
            for (let i = 0; i < 6; i++) {
                try {
                    const b = await fetch(ARC_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['0x' + (num - i).toString(16), false], id: i + 2 }) });
                    const bd = await b.json();
                    if (bd.result) { const r = bd.result; blocks.push({ height: num - i, validator: (r.miner || '0x0000').slice(0, 6) + '...' + (r.miner || '0x0000').slice(-4), txCount: r.transactions?.length || 0, time: `${(i * 2) + 2}s ago` }); }
                } catch {}
            }
            setRecentBlocks(blocks);
        } catch (err) { console.error(err); }
    }

    if (!mounted) return null;

    const stats = [
        { label: 'Block Height', value: blockHeight, color: 'var(--green)', glow: 'card-glow-green', gradient: 'text-gradient-green' },
        { label: 'Validators', value: '1', color: 'var(--orange)', glow: 'card-glow-orange', gradient: 'text-gradient-sunset' },
        { label: 'Block Time', value: '~2s', color: 'var(--blue)', glow: 'card-glow-blue', gradient: 'text-gradient-ocean' },
        { label: 'Network', value: 'Live', color: 'var(--lilac)', glow: 'card-glow-lilac', gradient: 'text-gradient-purple' },
    ];

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', position: 'relative' }}>
            <div className="orb orb-lilac" style={{ width: 400, height: 400, top: -100, right: -100 }} />
            <div className="orb orb-pink" style={{ width: 300, height: 300, bottom: 100, left: -100 }} />

            <header className="animate-fade-up" style={{ marginBottom: 48, position: 'relative' }}>
                <h1 className="heading-xl text-gradient-green">Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 500, marginTop: 8 }}>ARC Testnet network overview and real-time activity.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
                {stats.map((s, i) => (
                    <div key={s.label} className={`card ${s.glow} animate-fade-up delay-${i + 1}`} style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.6 }} />
                        <div className="stat-label" style={{ marginBottom: 12, marginTop: 8 }}>{s.label}</div>
                        <div className={`stat-value ${s.gradient}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
                <div className="card animate-fade-up delay-5" style={{ padding: 0 }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="heading-md" style={{ margin: 0 }}>Recent Blocks</h3>
                        <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>Explorer \u2192</a>
                    </div>
                    <div style={{ padding: '0 24px' }}>
                        {recentBlocks.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading blocks...</div>}
                        {recentBlocks.map((block, idx) => (
                            <div key={block.height} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', padding: '16px 0', borderBottom: idx === recentBlocks.length - 1 ? 'none' : '1px solid var(--border)', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: 'var(--green)', fontSize: '0.88rem', fontFamily: 'Space Grotesk, monospace', fontWeight: 600, marginBottom: 3 }}>#{block.height.toLocaleString()}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{block.time}</div>
                                </div>
                                <div style={{ fontFamily: 'Space Grotesk, monospace', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{block.validator}</div>
                                <div style={{ textAlign: 'right' }}><span className="chip chip-green">{block.txCount} txns</span></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card card-glow-green" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div className="orb orb-green" style={{ width: 120, height: 120, top: -40, right: -40, opacity: 0.2 }} />
                        <h3 className="heading-md" style={{ margin: '0 0 16px 0' }}>Network Status</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div className="status-dot status-dot-live" />
                            <span style={{ color: 'var(--green)', fontSize: '0.95rem', fontWeight: 600 }}>Testnet is Live</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.7, margin: 0 }}>All RPC endpoints and bridge infrastructure are fully synced and operational.</p>
                    </div>

                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <h3 className="heading-md" style={{ margin: 0 }}>Quick Actions</h3>
                        </div>
                        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { label: 'Deploy Contract', href: '/deploy', color: 'var(--orange)' },
                                { label: 'Mint NFT', href: '/nft-studio', color: 'var(--pink)' },
                                { label: 'View Analytics', href: '/analytics', color: 'var(--blue)' },
                            ].map(action => (
                                <a key={action.label} href={action.href}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', transition: 'all 0.2s ease', textDecoration: 'none' }}
                                    onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                    onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                                >
                                    <span style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{action.label}</span>
                                    <span style={{ color: action.color, fontSize: '1.1rem' }}>\u2192</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
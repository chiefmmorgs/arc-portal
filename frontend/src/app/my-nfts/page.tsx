'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/lib/wallet';
import { ethers } from 'ethers';

const ERC721_ABI = [
    'function balanceOf(address owner) external view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
    'function tokenURI(uint256 tokenId) external view returns (string)',
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function totalSupply() external view returns (uint256)',
];

const ARC_RPC = 'https://arc-testnet.g.alchemy.com/v2/FNzJDOWKoN8fHNgIwXZIdghzqJvpaIKR';
const STORAGE_KEY = 'arc-portal-nft-contracts';

interface NFTItem { contractAddress: string; collectionName: string; collectionSymbol: string; tokenId: string; tokenURI: string; imageUrl: string | null; name: string; description: string; attributes: { trait_type: string; value: string }[]; }
interface CollectionInfo { address: string; name: string; symbol: string; balance: number; totalSupply: number; }

function getSavedContracts(): string[] { if (typeof window === 'undefined') return []; try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } }
function saveContract(addr: string) { const c = getSavedContracts(); if (!c.includes(addr.toLowerCase())) { c.push(addr.toLowerCase()); localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } }
function resolveIPFS(uri: string): string { if (!uri) return ''; if (uri.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`; return uri; }

export default function MyNFTsPage() {
    const { address, isConnected, connect } = useWallet();
    const [nfts, setNfts] = useState<NFTItem[]>([]);
    const [collections, setCollections] = useState<CollectionInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [addingContract, setAddingContract] = useState(false);
    const [newContract, setNewContract] = useState('');
    const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);

    const scanWallet = useCallback(async () => {
        if (!address) return;
        setLoading(true); setError(''); setNfts([]); setCollections([]);
        try {
            const rpc = new ethers.JsonRpcProvider(ARC_RPC);
            const contracts = getSavedContracts();
            if (!contracts.length) { setLoading(false); return; }
            const cols: CollectionInfo[] = []; const all: NFTItem[] = [];
            for (const ca of contracts) {
                try {
                    const c = new ethers.Contract(ca, ERC721_ABI, rpc);
                    const [name, symbol, balance, totalSupply] = await Promise.all([c.name().catch(() => 'Unknown'), c.symbol().catch(() => '???'), c.balanceOf(address).catch(() => BigInt(0)), c.totalSupply().catch(() => BigInt(0))]);
                    const bal = Number(balance);
                    cols.push({ address: ca, name, symbol, balance: bal, totalSupply: Number(totalSupply) });
                    for (let i = 0; i < bal; i++) {
                        try {
                            const tokenId = await c.tokenOfOwnerByIndex(address, i);
                            const tokenURI = await c.tokenURI(tokenId);
                            let imageUrl: string | null = null, nftName = `${symbol} #${tokenId}`, nftDesc = '', nftAttrs: any[] = [];
                            try { const r = await fetch(resolveIPFS(tokenURI)); if (r.ok) { const m = await r.json(); nftName = m.name || nftName; nftDesc = m.description || ''; nftAttrs = m.attributes || []; if (m.image) imageUrl = resolveIPFS(m.image); } } catch {}
                            all.push({ contractAddress: ca, collectionName: name, collectionSymbol: symbol, tokenId: tokenId.toString(), tokenURI, imageUrl, name: nftName, description: nftDesc, attributes: nftAttrs });
                        } catch {}
                    }
                } catch {}
            }
            setCollections(cols); setNfts(all);
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    }, [address]);

    useEffect(() => { if (isConnected && address) scanWallet(); }, [isConnected, address, scanWallet]);

    function handleAddContract() { if (!ethers.isAddress(newContract)) { setError('Invalid address'); return; } saveContract(newContract); setNewContract(''); setAddingContract(false); scanWallet(); }
    function handleRemoveContract(addr: string) { localStorage.setItem(STORAGE_KEY, JSON.stringify(getSavedContracts().filter(c => c !== addr.toLowerCase()))); scanWallet(); }

    if (!isConnected) {
        return (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', position: 'relative' }}>
                <div className="orb orb-lilac" style={{ width: 300, height: 300, top: -80, right: -80, background: 'var(--lilac)' }} />
                <header className="animate-fade-up" style={{ marginBottom: 40 }}>
                    <h1 className="heading-xl text-gradient-purple">My NFTs</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: 8 }}>View your NFT collection on ARC testnet.</p>
                </header>
                <div className="card card-glow-pink animate-fade-up delay-1" onClick={connect} style={{ textAlign: 'center', padding: 48, cursor: 'pointer' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>◆</div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem', margin: '0 0 8px 0' }}>Connect Wallet</p>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Connect your wallet to view your NFTs.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', position: 'relative' }}>
            <div className="orb orb-pink" style={{ width: 350, height: 350, top: -80, right: -80 }} />

            <header className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
                <div>
                    <h1 className="heading-xl text-gradient-purple">My NFTs</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: 8 }}>Manage and view your collection.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="chip chip-pink">{collections.length} Collection{collections.length !== 1 ? 's' : ''}</span>
                    <span className="chip chip-green">{nfts.length} NFT{nfts.length !== 1 ? 's' : ''}</span>
                    <button className="btn btn-ghost" onClick={() => setAddingContract(!addingContract)} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>+ Track</button>
                    <button className="btn btn-primary" onClick={scanWallet} disabled={loading} style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
                        {loading ? 'Scanning...' : 'Refresh'}
                    </button>
                </div>
            </header>

            {error && <div style={{ color: '#ef4444', marginBottom: 24, fontSize: '0.88rem' }}>{error}</div>}

            {addingContract && (
                <div className="card animate-fade-up" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input type="text" placeholder="0x..." value={newContract} onChange={e => setNewContract(e.target.value)} className="input" style={{ flex: 1 }} />
                    <button className="btn btn-primary" onClick={handleAddContract} style={{ padding: '10px 20px' }}>Add</button>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-secondary)' }}>Scanning wallet...</div>
            ) : nfts.length === 0 && collections.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }}>◆</div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 8px 0' }}>No NFTs Found</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>Mint in the NFT Studio or add a collection to track.</p>
                </div>
            ) : (
                <>
                    {collections.length > 0 && (
                        <div style={{ marginBottom: 40 }}>
                            <h3 className="heading-md" style={{ margin: '0 0 16px 0' }}>Collections</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                                {collections.map(col => (
                                    <div key={col.address} className="card card-glow-pink" style={{ padding: 20 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                            <div>
                                                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{col.name}</div>
                                                <span className="chip chip-pink" style={{ marginTop: 4 }}>{col.symbol}</span>
                                            </div>
                                            <button onClick={() => handleRemoveContract(col.address)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>x</button>
                                        </div>
                                        <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                            {col.address.slice(0, 8)}...{col.address.slice(-6)}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Owned</span>
                                            <span style={{ color: 'var(--green)', fontWeight: 600 }}>{col.balance} / {col.totalSupply}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {nfts.length > 0 && (
                        <div>
                            <h3 className="heading-md" style={{ margin: '0 0 16px 0' }}>Tokens</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
                                {nfts.map((nft, idx) => (
                                    <div key={`${nft.contractAddress}-${nft.tokenId}-${idx}`} onClick={() => setSelectedNFT(nft)}
                                        className="card card-glow-pink" style={{ padding: 0, cursor: 'pointer', overflow: 'hidden' }}>
                                        <div style={{ aspectRatio: '1/1', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {nft.imageUrl ? <img src={nft.imageUrl} alt={nft.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontSize: '2.5rem', opacity: 0.15 }}>◆</span>}
                                        </div>
                                        <div style={{ padding: 14 }}>
                                            <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nft.name}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>{nft.collectionName}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {selectedNFT && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24, backdropFilter: 'blur(8px)' }}
                    onClick={() => setSelectedNFT(null)}>
                    <div className="card card-glow-pink" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', padding: 28 }}
                        onClick={e => e.stopPropagation()}>
                        {selectedNFT.imageUrl && <img src={selectedNFT.imageUrl} alt={selectedNFT.name} style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }} />}
                        <h2 className="heading-md" style={{ margin: '0 0 8px 0' }}>{selectedNFT.name}</h2>
                        {selectedNFT.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 24px 0', lineHeight: 1.6 }}>{selectedNFT.description}</p>}
                        <div className="divider" style={{ marginBottom: 16 }} />
                        {[
                            ['Collection', `${selectedNFT.collectionName} (${selectedNFT.collectionSymbol})`],
                            ['Token ID', selectedNFT.tokenId],
                        ].map(([l, v]) => (
                            <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--bg-surface)' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{l}</span>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'Space Grotesk, monospace' }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', marginBottom: 20 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Contract</span>
                            <a href={`https://testnet.arcscan.app/address/${selectedNFT.contractAddress}`} target="_blank" rel="noreferrer"
                                style={{ color: 'var(--pink)', fontSize: '0.82rem', fontFamily: 'Space Grotesk, monospace', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                                {selectedNFT.contractAddress.slice(0, 8)}...{selectedNFT.contractAddress.slice(-6)}
                            </a>
                        </div>
                        {selectedNFT.attributes.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <h4 className="stat-label" style={{ marginBottom: 10 }}>Attributes</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {selectedNFT.attributes.map((a, i) => (
                                        <div key={i} className="chip chip-pink" style={{ flexDirection: 'column', padding: '8px 14px', alignItems: 'flex-start' }}>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>{a.trait_type}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{a.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedNFT(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
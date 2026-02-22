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

interface NFTItem {
    contractAddress: string;
    collectionName: string;
    collectionSymbol: string;
    tokenId: string;
    tokenURI: string;
    imageUrl: string | null;
    name: string;
    description: string;
    attributes: { trait_type: string; value: string }[];
}

interface CollectionInfo {
    address: string;
    name: string;
    symbol: string;
    balance: number;
    totalSupply: number;
}

function getSavedContracts(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
}

function saveContract(address: string) {
    const contracts = getSavedContracts();
    if (!contracts.includes(address.toLowerCase())) {
        contracts.push(address.toLowerCase());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
    }
}

function resolveIPFS(uri: string): string {
    if (!uri) return '';
    if (uri.startsWith('ipfs://')) {
        return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
    }
    return uri;
}

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
        setLoading(true);
        setError('');
        setNfts([]);
        setCollections([]);

        try {
            const rpcProvider = new ethers.JsonRpcProvider(ARC_RPC);
            const contracts = getSavedContracts();

            if (contracts.length === 0) {
                setLoading(false);
                return;
            }

            const collectionInfos: CollectionInfo[] = [];
            const allNFTs: NFTItem[] = [];

            for (const contractAddr of contracts) {
                try {
                    const contract = new ethers.Contract(contractAddr, ERC721_ABI, rpcProvider);

                    const [name, symbol, balance, totalSupply] = await Promise.all([
                        contract.name().catch(() => 'Unknown'),
                        contract.symbol().catch(() => '???'),
                        contract.balanceOf(address).catch(() => BigInt(0)),
                        contract.totalSupply().catch(() => BigInt(0)),
                    ]);

                    const bal = Number(balance);
                    collectionInfos.push({
                        address: contractAddr,
                        name,
                        symbol,
                        balance: bal,
                        totalSupply: Number(totalSupply),
                    });

                    for (let i = 0; i < bal; i++) {
                        try {
                            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
                            const tokenURI = await contract.tokenURI(tokenId);

                            let imageUrl: string | null = null;
                            let nftName = `${symbol} #${tokenId.toString()}`;
                            let nftDescription = '';
                            let nftAttributes: { trait_type: string; value: string }[] = [];

                            try {
                                const metadataUrl = resolveIPFS(tokenURI);
                                const metaRes = await fetch(metadataUrl);
                                if (metaRes.ok) {
                                    const metadata = await metaRes.json();
                                    nftName = metadata.name || nftName;
                                    nftDescription = metadata.description || '';
                                    nftAttributes = metadata.attributes || [];
                                    if (metadata.image) {
                                        imageUrl = resolveIPFS(metadata.image);
                                    }
                                }
                            } catch { /* ignore */ }

                            allNFTs.push({
                                contractAddress: contractAddr,
                                collectionName: name,
                                collectionSymbol: symbol,
                                tokenId: tokenId.toString(),
                                tokenURI,
                                imageUrl,
                                name: nftName,
                                description: nftDescription,
                                attributes: nftAttributes,
                            });
                        } catch { /* ignore */ }
                    }
                } catch { /* ignore */ }
            }

            setCollections(collectionInfos);
            setNfts(allNFTs);
        } catch (err: any) {
            setError(err.message || 'Error scanning wallet');
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        if (isConnected && address) {
            scanWallet();
        }
    }, [isConnected, address, scanWallet]);

    function handleAddContract() {
        if (!ethers.isAddress(newContract)) {
            setError('Enter a valid contract address');
            return;
        }
        saveContract(newContract);
        setNewContract('');
        setAddingContract(false);
        setError('');
        scanWallet();
    }

    function handleRemoveContract(addr: string) {
        const contracts = getSavedContracts().filter(c => c !== addr.toLowerCase());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
        scanWallet();
    }

    const inputClasses = {
        background: '#0a0a0f',
        border: '1px solid #1e1e2e',
        color: '#ededed',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '0.9rem',
        outline: 'none',
        flex: 1
    };

    const btnClasses = {
        background: '#ededed',
        color: '#0a0a0f',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '0.9rem',
        fontWeight: 500,
        cursor: 'pointer',
    };

    const btnSecondaryClasses = {
        background: '#1e1e2e',
        color: '#ededed',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '0.9rem',
        fontWeight: 500,
        cursor: 'pointer',
    };

    if (!isConnected) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, sans-serif' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ededed', margin: '0 0 8px 0' }}>My NFTs</h1>
                    <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>View your NFT collection on ARC testnet</p>
                </header>
                <div
                    onClick={connect}
                    style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '32px', textAlign: 'center', cursor: 'pointer' }}
                >
                    <p style={{ color: '#ededed', margin: 0, fontWeight: 500 }}>Please connect your wallet to view your NFTs.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ededed', margin: '0 0 8px 0' }}>My NFTs</h1>
                    <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>Manage and view your NFTs on the ARC testnet.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                        {collections.length} Collection{collections.length !== 1 ? 's' : ''} • {nfts.length} NFT{nfts.length !== 1 ? 's' : ''}
                    </span>
                    <button style={btnSecondaryClasses} onClick={() => setAddingContract(!addingContract)}>
                        + Track Collection
                    </button>
                    <button style={btnClasses} onClick={scanWallet} disabled={loading}>
                        {loading ? 'Scanning...' : 'Refresh'}
                    </button>
                </div>
            </header>

            {error && <div style={{ color: '#ef4444', marginBottom: '24px', fontSize: '0.9rem' }}>{error}</div>}

            {/* Add Contract Form (Monochrome Two-Column Layout) */}
            {addingContract && (
                <div style={{ display: 'flex', padding: '24px 0', borderTop: '1px solid #1e1e2e', borderBottom: '1px solid #1e1e2e', marginBottom: '32px', gap: '48px' }}>
                    <div style={{ flex: '0 0 300px' }}>
                        <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>Track Collection</label>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                            Enter an ARC testnet ERC-721 contract address to scan for your tokens.
                        </p>
                    </div>
                    <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={newContract}
                            onChange={e => setNewContract(e.target.value)}
                            style={inputClasses}
                        />
                        <button style={btnClasses} onClick={handleAddContract}>Add</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#a1a1aa' }}>Scanning wallet...</div>
            ) : nfts.length === 0 && collections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', background: '#0a0a0f', border: '1px dashed #1e1e2e', borderRadius: '8px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🖼️</div>
                    <p style={{ color: '#ededed', fontWeight: 500, margin: '0 0 8px 0' }}>No NFTs Found</p>
                    <p style={{ color: '#a1a1aa', fontSize: '0.9rem', margin: 0 }}>Deploy a contract in the NFT Studio or add a collection to track.</p>
                </div>
            ) : (
                <>
                    {/* Collections Summary */}
                    {collections.length > 0 && (
                        <div style={{ marginBottom: '48px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#ededed', marginBottom: '16px' }}>Collections</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                                {collections.map(col => (
                                    <div key={col.address} style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ color: '#ededed', fontWeight: 500, fontSize: '0.95rem' }}>{col.name}</div>
                                                <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{col.symbol}</div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveContract(col.address)}
                                                style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
                                                title="Remove"
                                            >×</button>
                                        </div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#71717a', marginBottom: '12px' }}>
                                            {col.address.slice(0, 8)}...{col.address.slice(-6)}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ color: '#a1a1aa' }}>Owned</span>
                                            <span style={{ color: '#ededed', fontWeight: 500 }}>{col.balance} / {col.totalSupply}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NFT Grid */}
                    {nfts.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#ededed', marginBottom: '16px' }}>Tokens</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                {nfts.map((nft, idx) => (
                                    <div
                                        key={`${nft.contractAddress}-${nft.tokenId}-${idx}`}
                                        onClick={() => setSelectedNFT(nft)}
                                        style={{
                                            background: '#09090b',
                                            border: '1px solid #27272a',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = '#52525b'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = '#27272a'}
                                    >
                                        <div style={{ aspectRatio: '1/1', background: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {nft.imageUrl ? (
                                                <img src={nft.imageUrl} alt={nft.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '2rem', opacity: 0.2 }}>🖼️</span>
                                            )}
                                        </div>
                                        <div style={{ padding: '12px' }}>
                                            <div style={{ color: '#ededed', fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {nft.name}
                                            </div>
                                            <div style={{ color: '#a1a1aa', fontSize: '0.75rem', marginTop: '2px' }}>
                                                {nft.collectionName}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {selectedNFT && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
                    onClick={() => setSelectedNFT(null)}
                >
                    <div
                        style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {selectedNFT.imageUrl && (
                            <img src={selectedNFT.imageUrl} alt={selectedNFT.name} style={{ width: '100%', borderRadius: '8px', border: '1px solid #27272a', marginBottom: '24px' }} />
                        )}
                        <h2 style={{ fontSize: '1.25rem', color: '#ededed', fontWeight: 600, margin: '0 0 8px 0' }}>{selectedNFT.name}</h2>
                        {selectedNFT.description && (
                            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                                {selectedNFT.description}
                            </p>
                        )}

                        <div style={{ borderTop: '1px solid #27272a', paddingTop: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #18181b' }}>
                                <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Collection</span>
                                <span style={{ color: '#ededed', fontSize: '0.85rem' }}>{selectedNFT.collectionName} ({selectedNFT.collectionSymbol})</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #18181b' }}>
                                <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Token ID</span>
                                <span style={{ color: '#ededed', fontSize: '0.85rem', fontFamily: 'monospace' }}>{selectedNFT.tokenId}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>Contract</span>
                                <a href={`https://testnet.arcscan.app/address/${selectedNFT.contractAddress}`} target="_blank" rel="noreferrer" style={{ color: '#ededed', fontSize: '0.85rem', fontFamily: 'monospace', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                                    {selectedNFT.contractAddress.slice(0, 8)}...{selectedNFT.contractAddress.slice(-6)}
                                </a>
                            </div>
                        </div>

                        {selectedNFT.attributes.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ color: '#ededed', fontSize: '0.9rem', fontWeight: 500, margin: '0 0 12px 0' }}>Attributes</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {selectedNFT.attributes.map((attr, i) => (
                                        <div key={i} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', padding: '8px 12px' }}>
                                            <div style={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>{attr.trait_type}</div>
                                            <div style={{ color: '#ededed', fontSize: '0.85rem', fontWeight: 500 }}>{attr.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            {selectedNFT.tokenURI && (
                                <a href={resolveIPFS(selectedNFT.tokenURI)} target="_blank" rel="noreferrer" style={{ ...btnSecondaryClasses, flex: 1, textAlign: 'center', textDecoration: 'none' } as React.CSSProperties}>
                                    View Metadata
                                </a>
                            )}
                            <button style={{ ...btnClasses, flex: 1 }} onClick={() => setSelectedNFT(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/lib/wallet';
import { uploadImage, uploadMetadata } from '@/lib/api';
import { ethers } from 'ethers';

const ERC721_MINT_ABI = [
    'function mint(address to, string memory metadataURI) external returns (uint256)',
    'function totalSupply() external view returns (uint256)',
];

const STORAGE_KEY = 'arc-portal-nft-contracts';

function saveContract(address: string) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const contracts: string[] = saved ? JSON.parse(saved) : [];
        if (!contracts.includes(address.toLowerCase())) {
            contracts.push(address.toLowerCase());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
        }
    } catch {}
}

export default function NFTStudioPage() {
    const { address, isConnected, signMessage, signer } = useWallet();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [nftName, setNftName] = useState('');
    const [nftDesc, setNftDesc] = useState('');
    const [contractOption, setContractOption] = useState<'new' | 'existing'>('new');
    const [collectionName, setCollectionName] = useState('');
    const [collectionSymbol, setCollectionSymbol] = useState('');
    const [existingContract, setExistingContract] = useState('');
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState<{ contract: string; receipt: string; tokenId: string; imageUri?: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleExecute = async () => {
        if (!isConnected || !signer) { setError('Connect your wallet first.'); return; }
        if (!imageFile || !nftName || !nftDesc) { setError('Fill out all details and upload an image.'); return; }
        if (contractOption === 'new' && (!collectionName || !collectionSymbol)) { setError('Collection name & symbol required.'); return; }
        if (contractOption === 'existing' && !existingContract) { setError('Provide a contract address.'); return; }

        setIsMinting(true); setError(''); setSuccessData(null);

        try {
            const imgRes = await uploadImage(imageFile, address!);
            const metaRes = await uploadMetadata({
                name: nftName, description: nftDesc,
                image: `ipfs://${imgRes.cid}`,
                attributes: [{ trait_type: 'Creator', value: address || '' }],
                owner: address!,
            });
            const tokenURI = metaRes.metadataUri || `ipfs://${metaRes.cid}`;

            let targetContract = existingContract;
            if (contractOption === 'new') {
                const deployBody = { name: collectionName, symbol: collectionSymbol, maxSupply: 10000, baseURI: '', royaltyBps: 500, owner: address! };
                const sigMessage = `ARC-Portal:${JSON.stringify(deployBody)}`;
                const signature = await signMessage(sigMessage);
                const deployRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/deploy/erc721`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-wallet-address': address!, 'x-wallet-signature': signature },
                    body: JSON.stringify(deployBody),
                });
                if (!deployRes.ok) { const err = await deployRes.json(); throw new Error(err.error || 'Deploy failed'); }
                const deployData = await deployRes.json();
                const tx = await signer!.sendTransaction({ data: deployData.transaction.data, gasLimit: deployData.transaction.gasEstimate || '3000000' });
                const receipt = await tx.wait();
                if (receipt?.contractAddress) targetContract = receipt.contractAddress;
                else throw new Error('No contract address');
            }

            saveContract(targetContract);
            const contract = new ethers.Contract(targetContract, ERC721_MINT_ABI, signer);
            let nextTokenId = '0';
            try { const ts = await contract.totalSupply(); nextTokenId = ts.toString(); } catch {}
            const tx = await contract.mint(address, tokenURI);
            await tx.wait();
            setSuccessData({ contract: targetContract, receipt: tx.hash, tokenId: nextTokenId, imageUri: imgRes.cid });
        } catch (err: any) {
            setError(err.message || 'Minting failed.');
        } finally { setIsMinting(false); }
    };

    if (successData) {
        return (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', position: 'relative' }}>
                <div className="orb orb-pink" style={{ width: 400, height: 400, top: -100, right: -100 }} />
                <header className="animate-fade-up" style={{ marginBottom: 40 }}>
                    <h1 className="heading-xl text-gradient-purple">Mint Successful!</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: 8 }}>Your NFT is live on ARC testnet.</p>
                </header>
                <div className="card card-glow-pink animate-fade-up delay-1" style={{ display: 'flex', gap: 40, padding: 32 }}>
                    <div style={{ flex: '0 0 280px' }}>
                        {successData.imageUri && (
                            <img src={`https://gateway.pinata.cloud/ipfs/${successData.imageUri}`} alt="Minted NFT"
                                style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', aspectRatio: '1/1', objectFit: 'cover' }} />
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
                        <div>
                            <div className="stat-label" style={{ marginBottom: 4 }}>Contract</div>
                            <a href={`https://testnet.arcscan.app/address/${successData.contract}`} target="_blank" rel="noreferrer"
                                style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '0.88rem', color: 'var(--pink)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                                {successData.contract}
                            </a>
                        </div>
                        <div>
                            <div className="stat-label" style={{ marginBottom: 4 }}>Token ID</div>
                            <div className="stat-value text-gradient-purple">#{successData.tokenId}</div>
                        </div>
                        <div>
                            <div className="stat-label" style={{ marginBottom: 4 }}>Transaction</div>
                            <a href={`https://testnet.arcscan.app/tx/${successData.receipt}`} target="_blank" rel="noreferrer"
                                style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '0.82rem', color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                                {successData.receipt.slice(0, 14)}...{successData.receipt.slice(-10)}
                            </a>
                        </div>
                        <button onClick={() => { setSuccessData(null); setImageFile(null); setImagePreview(''); setNftName(''); setNftDesc(''); }}
                            className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                            Mint Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', position: 'relative' }}>
            <div className="orb orb-pink" style={{ width: 350, height: 350, top: -80, right: -80 }} />
            <div className="orb orb-blue" style={{ width: 250, height: 250, bottom: 100, left: -80 }} />

            <header className="animate-fade-up" style={{ marginBottom: 48 }}>
                <h1 className="heading-xl text-gradient-purple">NFT Studio</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: 8, maxWidth: 500 }}>
                    Create, upload, and mint your NFTs in one seamless transaction.
                </p>
            </header>

            <div className="card animate-fade-up delay-1" style={{ padding: 0, marginBottom: 32 }}>
                {/* Image Upload */}
                <div style={{ display: 'flex', padding: '28px', borderBottom: '1px solid var(--border)', gap: 48 }}>
                    <div style={{ flex: '0 0 240px' }}>
                        <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 600, marginBottom: 4 }}>
                            <span style={{ color: 'var(--pink)', marginRight: 8 }}>01</span>NFT Asset
                        </label>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Upload image to pin on IPFS permanently.</p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: imagePreview ? '1px solid var(--border)' : '2px dashed var(--border)',
                                borderRadius: 12, padding: imagePreview ? 8 : '48px 24px',
                                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-surface)',
                                transition: 'all 0.25s ease',
                            }}>
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" style={{ maxHeight: 220, borderRadius: 8, maxWidth: '100%', objectFit: 'contain' }} />
                            ) : (
                                <div>
                                    <div style={{ fontSize: '2rem', marginBottom: 12, color: 'var(--pink)' }}>◆</div>
                                    <p style={{ color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 4px 0' }}>Click to upload</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>JPEG, PNG, GIF, WebP up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Token Details */}
                <div style={{ display: 'flex', padding: '28px', borderBottom: '1px solid var(--border)', gap: 48 }}>
                    <div style={{ flex: '0 0 240px' }}>
                        <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 600, marginBottom: 4 }}>
                            <span style={{ color: 'var(--blue)', marginRight: 8 }}>02</span>Token Details
                        </label>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Name and description for your NFT.</p>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input type="text" value={nftName} onChange={e => setNftName(e.target.value)} placeholder="NFT Name" className="input" />
                        <textarea value={nftDesc} onChange={e => setNftDesc(e.target.value)} placeholder="Description..." rows={3}
                            className="input" style={{ resize: 'vertical' }} />
                    </div>
                </div>

                {/* Collection */}
                <div style={{ display: 'flex', padding: '28px', borderBottom: '1px solid var(--border)', gap: 48 }}>
                    <div style={{ flex: '0 0 240px' }}>
                        <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 600, marginBottom: 4 }}>
                            <span style={{ color: 'var(--orange)', marginRight: 8 }}>03</span>Collection
                        </label>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Deploy new or use existing ERC-721.</p>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {(['new', 'existing'] as const).map(opt => (
                                <button key={opt} onClick={() => setContractOption(opt)}
                                    className={contractOption === opt ? 'btn btn-primary' : 'btn btn-ghost'}
                                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
                                    {opt === 'new' ? 'Deploy New' : 'Use Existing'}
                                </button>
                            ))}
                        </div>
                        {contractOption === 'new' ? (
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input type="text" value={collectionName} onChange={e => setCollectionName(e.target.value)}
                                    placeholder="Collection Name" className="input" style={{ flex: 2 }} />
                                <input type="text" value={collectionSymbol} onChange={e => setCollectionSymbol(e.target.value)}
                                    placeholder="Symbol" className="input" style={{ flex: 1 }} />
                            </div>
                        ) : (
                            <input type="text" value={existingContract} onChange={e => setExistingContract(e.target.value)}
                                placeholder="Contract Address (0x...)" className="input" />
                        )}
                    </div>
                </div>

                {/* Action */}
                <div style={{ display: 'flex', padding: '24px 28px', alignItems: 'center', justifyContent: 'space-between' }}>
                    {error && <span style={{ color: '#ef4444', fontSize: '0.88rem' }}>{error}</span>}
                    <div style={{ marginLeft: 'auto' }}>
                        <button onClick={handleExecute} disabled={isMinting} className="btn btn-primary"
                            style={{ padding: '12px 32px', fontSize: '0.95rem', opacity: isMinting ? 0.6 : 1 }}>
                            {isMinting ? '⏳ Minting...' : '◆ Create NFT'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
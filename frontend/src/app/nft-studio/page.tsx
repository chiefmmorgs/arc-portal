'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/lib/wallet';
import { uploadImage, uploadMetadata, type UploadResult } from '@/lib/api';
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
    } catch { /* ignore */ }
}

export default function NFTStudioPage() {
    const { address, isConnected, signMessage, signer, provider } = useWallet();

    // Form State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [nftName, setNftName] = useState('');
    const [nftDesc, setNftDesc] = useState('');

    // Contract Option (new or existing)
    const [contractOption, setContractOption] = useState<'new' | 'existing'>('new');
    const [collectionName, setCollectionName] = useState('');
    const [collectionSymbol, setCollectionSymbol] = useState('');
    const [existingContract, setExistingContract] = useState('');

    // Process State
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState<{ contract: string, receipt: string, tokenId: string, imageUri?: string } | null>(null);

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
        if (!isConnected || !signer) {
            setError('Please connect your wallet first.');
            return;
        }
        if (!imageFile || !nftName || !nftDesc) {
            setError('Please fill out all NFT details and upload an image.');
            return;
        }
        if (contractOption === 'new' && (!collectionName || !collectionSymbol)) {
            setError('Collection name and symbol are required for a new contract.');
            return;
        }
        if (contractOption === 'existing' && !existingContract) {
            setError('Please provide an existing contract address.');
            return;
        }

        setIsMinting(true);
        setError('');
        setSuccessData(null);

        try {
            // 1. Upload Image
            const imgRes = await uploadImage(imageFile, address!);

            // 2. Upload Metadata
            const metadataObj = {
                name: nftName,
                description: nftDesc,
                image: `ipfs://${imgRes.cid}`,
                attributes: [{ trait_type: 'Creator', value: address || '' }],
            };
            const metaRes = await uploadMetadata({
                ...metadataObj,
                image: `ipfs://${imgRes.cid}`,
                owner: address!,
            });

            const tokenURI = metaRes.metadataUri || `ipfs://${metaRes.cid}`;

            // 3. Deploy or set contract
            let targetContract = existingContract;
            if (contractOption === 'new') {
                // Build the body matching backend's expected fields
                const deployBody = {
                    name: collectionName,
                    symbol: collectionSymbol,
                    maxSupply: 10000,
                    baseURI: '',
                    royaltyBps: 500,
                    owner: address!,
                };

                // Sign the exact message format: "ARC-Portal:{JSON body}"
                const sigMessage = `ARC-Portal:${JSON.stringify(deployBody)}`;
                const signature = await signMessage(sigMessage);

                const deployRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/deploy/erc721`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-wallet-address': address!,
                        'x-wallet-signature': signature,
                    },
                    body: JSON.stringify(deployBody),
                });
                if (!deployRes.ok) {
                    const err = await deployRes.json();
                    throw new Error(err.error || 'Contract deployment failed');
                }
                const deployData = await deployRes.json();
                // Send the deployment transaction via the signer
                const tx = await signer!.sendTransaction({
                    data: deployData.transaction.data,
                    gasLimit: deployData.transaction.gasEstimate || '3000000',
                });
                const receipt = await tx.wait();
                if (receipt && receipt.contractAddress) {
                    targetContract = receipt.contractAddress;
                } else {
                    throw new Error('Failed to get contract address from deployment receipt');
                }
            }

            // Save contract for Gallery
            saveContract(targetContract);

            // 4. Mint
            const contract = new ethers.Contract(targetContract, ERC721_MINT_ABI, signer);
            let nextTokenId = '0';
            try {
                const ts = await contract.totalSupply();
                nextTokenId = ts.toString();
            } catch { /* ignore if totalSupply fails */ }

            const tx = await contract.mint(address, tokenURI);
            const receipt = await tx.wait();

            setSuccessData({
                contract: targetContract,
                receipt: tx.hash,
                tokenId: nextTokenId,
                imageUri: imgRes.cid
            });

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred during the minting process.');
        } finally {
            setIsMinting(false);
        }
    };

    if (successData) {
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, sans-serif' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ededed', margin: '0 0 8px 0' }}>Mint Successful!</h1>
                    <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>Your new NFT has been created and minted on the ARC testnet.</p>
                </header>

                <div style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '32px', display: 'flex', gap: '48px' }}>
                    <div style={{ flex: '0 0 300px' }}>
                        {successData.imageUri && (
                            <img
                                src={`https://gateway.pinata.cloud/ipfs/${successData.imageUri}`}
                                alt="Minted NFT"
                                style={{ width: '100%', borderRadius: '8px', border: '1px solid #1e1e2e', aspectRatio: '1/1', objectFit: 'cover' }}
                            />
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
                        <div>
                            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '4px' }}>Contract Address</p>
                            <a href={`https://testnet.arcscan.app/address/${successData.contract}`} target="_blank" rel="noreferrer" style={{ color: '#ededed', textDecoration: 'underline', textUnderlineOffset: '4px', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                {successData.contract}
                            </a>
                        </div>
                        <div>
                            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '4px' }}>Token ID</p>
                            <p style={{ color: '#ededed', margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>#{successData.tokenId}</p>
                        </div>
                        <div>
                            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '4px' }}>Transaction</p>
                            <a href={`https://testnet.arcscan.app/tx/${successData.receipt}`} target="_blank" rel="noreferrer" style={{ color: '#ededed', textDecoration: 'underline', textUnderlineOffset: '4px', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                {successData.receipt.slice(0, 14)}...{successData.receipt.slice(-10)}
                            </a>
                        </div>
                        <button
                            onClick={() => { setSuccessData(null); setImageFile(null); setImagePreview(''); setNftName(''); setNftDesc(''); }}
                            style={{ alignSelf: 'flex-start', background: '#ededed', color: '#0a0a0f', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', marginTop: '16px' }}
                        >
                            Mint Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const inputClasses = {
        width: '100%',
        background: '#0a0a0f',
        border: '1px solid #1e1e2e',
        color: '#ededed',
        padding: '10px 12px',
        borderRadius: '6px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s'
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ededed', margin: '0 0 8px 0' }}>NFT Studio</h1>
                <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>Create, upload, and mint your NFTs in one seamless transaction.</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #1e1e2e' }}>

                {/* Row 1: Asset Upload */}
                <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                    <div style={{ flex: '0 0 300px' }}>
                        <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>NFT Asset</label>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                            Upload the image file for your NFT. This will be pinned permanently to IPFS.
                        </p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '1px dashed #3f3f46',
                                borderRadius: '8px',
                                padding: imagePreview ? '8px' : '48px 24px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: '#0a0a0f',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#71717a'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#3f3f46'}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" style={{ maxHeight: '200px', borderRadius: '4px', maxWidth: '100%', objectFit: 'contain' }} />
                            ) : (
                                <div>
                                    <div style={{ fontSize: '1.2rem', marginBottom: '12px', color: '#71717a' }}>↑</div>
                                    <p style={{ color: '#ededed', fontWeight: 500, margin: '0 0 4px 0' }}>Click to upload image</p>
                                    <p style={{ color: '#a1a1aa', fontSize: '0.8rem', margin: 0 }}>JPEG, PNG, GIF, WebP up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 2: Metadata */}
                <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                    <div style={{ flex: '0 0 300px' }}>
                        <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>Token Details</label>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                            The name and description of the specific token you are minting.
                        </p>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="text"
                            value={nftName}
                            onChange={e => setNftName(e.target.value)}
                            placeholder="NFT Name (e.g. Arcane Sword #1)"
                            style={inputClasses}
                            onFocus={e => e.target.style.borderColor = '#52525b'}
                            onBlur={e => e.target.style.borderColor = '#1e1e2e'}
                        />
                        <textarea
                            value={nftDesc}
                            onChange={e => setNftDesc(e.target.value)}
                            placeholder="Description..."
                            rows={3}
                            style={{ ...inputClasses, resize: 'vertical' }}
                            onFocus={e => e.target.style.borderColor = '#52525b'}
                            onBlur={e => e.target.style.borderColor = '#27272a'}
                        />
                    </div>
                </div>

                {/* Row 3: Collection Settings */}
                <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                    <div style={{ flex: '0 0 300px' }}>
                        <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>Collection Destination</label>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                            Mint to a new ERC-721 contract, or add to an existing collection you own.
                        </p>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', background: '#0a0a0f', padding: '4px', borderRadius: '8px', border: '1px solid #1e1e2e', width: 'fit-content' }}>
                            <button
                                onClick={() => setContractOption('new')}
                                style={{
                                    background: contractOption === 'new' ? '#1e1e2e' : 'transparent',
                                    color: contractOption === 'new' ? '#ededed' : '#a1a1aa',
                                    border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Deploy New Collection
                            </button>
                            <button
                                onClick={() => setContractOption('existing')}
                                style={{
                                    background: contractOption === 'existing' ? '#1e1e2e' : 'transparent',
                                    color: contractOption === 'existing' ? '#ededed' : '#a1a1aa',
                                    border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Use Existing Contract
                            </button>
                        </div>

                        {contractOption === 'new' ? (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input
                                    type="text"
                                    value={collectionName}
                                    onChange={e => setCollectionName(e.target.value)}
                                    placeholder="Collection Name"
                                    style={{ ...inputClasses, flex: 2 }}
                                    onFocus={e => e.target.style.borderColor = '#52525b'}
                                    onBlur={e => e.target.style.borderColor = '#27272a'}
                                />
                                <input
                                    type="text"
                                    value={collectionSymbol}
                                    onChange={e => setCollectionSymbol(e.target.value)}
                                    placeholder="Symbol (e.g. ART)"
                                    style={{ ...inputClasses, flex: 1 }}
                                    onFocus={e => e.target.style.borderColor = '#52525b'}
                                    onBlur={e => e.target.style.borderColor = '#27272a'}
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={existingContract}
                                onChange={e => setExistingContract(e.target.value)}
                                placeholder="Contract Address (0x...)"
                                style={inputClasses}
                                onFocus={e => e.target.style.borderColor = '#52525b'}
                                onBlur={e => e.target.style.borderColor = '#27272a'}
                            />
                        )}
                    </div>
                </div>

                {/* Row 4: Controls / Execute Button */}
                <div style={{ display: 'flex', padding: '32px 0', gap: '48px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {error && (
                        <div style={{ color: '#ef4444', fontSize: '0.9rem', marginRight: 'auto' }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleExecute}
                        disabled={isMinting}
                        style={{
                            background: '#ededed',
                            color: '#09090b',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '6px',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            cursor: isMinting ? 'not-allowed' : 'pointer',
                            opacity: isMinting ? 0.7 : 1,
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => { if (!isMinting) e.currentTarget.style.background = '#f4f4f5' }}
                        onMouseLeave={e => { if (!isMinting) e.currentTarget.style.background = '#ededed' }}
                    >
                        {isMinting ? 'Uploading & Minting...' : 'Create NFT'}
                    </button>
                </div>

            </div>
        </div>
    );
}

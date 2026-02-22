'use client';

import React, { useState } from 'react';
import { useWallet } from '@/lib/wallet';

const CONTRACT_TYPES = [
    { id: 'erc20', name: 'ERC-20 Token', desc: 'A standard fungible token with minting capabilities.' },
    { id: 'erc721', name: 'ERC-721 NFT', desc: 'A standard non-fungible token collection.' },
    { id: 'rewards', name: 'Rewards Distributor', desc: 'Distribute token rewards to users over time.' },
    { id: 'factory', name: 'Contract Factory', desc: 'A factory for deterministic contract deployments.' }
];

export default function DeployPage() {
    const { address, isConnected, signMessage, signer } = useWallet();
    const [type, setType] = useState('erc20');
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [initialSupply, setInitialSupply] = useState('1000000');
    const [maxSupply, setMaxSupply] = useState('10000');
    const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
    const [contractAddress, setContractAddress] = useState('');
    const [txHash, setTxHash] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
    const [verifyMsg, setVerifyMsg] = useState('');

    const handleDeploy = async () => {
        if (!isConnected || !signer || !address) {
            setErrorMsg('Please connect your wallet first.');
            setStatus('error');
            return;
        }
        if (!name) {
            setErrorMsg('Name is required.');
            setStatus('error');
            return;
        }
        if ((type === 'erc20' || type === 'erc721') && !symbol) {
            setErrorMsg('Symbol is required for token contracts.');
            setStatus('error');
            return;
        }

        setStatus('deploying');
        setErrorMsg('');

        try {
            // Build the request body matching what the backend expects
            let body: Record<string, unknown> = { owner: address };
            let verifyType = 'ERC20Token';
            let verifyArgs: unknown[] = [];

            if (type === 'erc20') {
                body = { name, symbol, decimals: 18, initialSupply, owner: address };
                verifyType = 'ERC20Token';
                verifyArgs = [name, symbol, 18, initialSupply, address];
            } else if (type === 'erc721') {
                const ms = parseInt(maxSupply) || 10000;
                body = { name, symbol, maxSupply: ms, baseURI: '', royaltyBps: 500, owner: address };
                verifyType = 'ERC721NFT';
                verifyArgs = [name, symbol, ms, '', 500, address];
            } else if (type === 'rewards') {
                body = { rewardToken: address, owner: address };
                verifyType = 'RewardDistributor';
                verifyArgs = [address, address];
            } else if (type === 'factory') {
                body = { owner: address };
                verifyType = 'DeploymentFactory';
                verifyArgs = [address];
            }

            // Sign the exact message format the backend expects:
            // "ARC-Portal:{JSON.stringify(body)}"
            const message = `ARC-Portal:${JSON.stringify(body)}`;
            const signature = await signMessage(message);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/deploy/${type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-wallet-address': address,
                    'x-wallet-signature': signature,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Deployment request failed');
            }

            const deployData = await res.json();

            // Send the deployment transaction via the user's signer
            const tx = await signer.sendTransaction({
                data: deployData.transaction.data,
                gasLimit: deployData.transaction.gasEstimate || '3000000',
            });
            setTxHash(tx.hash);
            const receipt = await tx.wait();

            if (receipt && receipt.contractAddress) {
                setContractAddress(receipt.contractAddress);
                setStatus('success');

                // Auto-verify on Blockscout
                autoVerify(receipt.contractAddress, verifyType, verifyArgs);
            } else {
                throw new Error('No contract address in transaction receipt');
            }
        } catch (err: any) {
            console.error('Deploy error:', err);
            setErrorMsg(err.message || 'Deployment failed');
            setStatus('error');
        }
    };

    const autoVerify = async (addr: string, contractType: string, constructorArgs: unknown[]) => {
        setVerifyStatus('verifying');
        setVerifyMsg('Submitting to Blockscout...');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/deploy/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractAddress: addr, contractType, constructorArgs }),
            });
            const data = await res.json();
            if (data.verified) {
                setVerifyStatus('verified');
                setVerifyMsg(data.message || 'Contract verified!');
            } else {
                setVerifyStatus('failed');
                setVerifyMsg(data.error || data.message || 'Verification failed');
            }
        } catch (err: any) {
            setVerifyStatus('failed');
            setVerifyMsg(err.message || 'Verification request failed');
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ededed', margin: '0 0 8px 0' }}>Deploy Contract</h1>
                <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>Deploy a new smart contract to the ARC testnet.</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #1e1e2e' }}>

                {/* Row 1: Contract Type */}
                <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                    <div style={{ flex: '0 0 300px' }}>
                        <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>Contract Type</label>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                            Select the type of smart contract you want to deploy to the network.
                        </p>
                    </div>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                        {CONTRACT_TYPES.map(t => (
                            <div
                                key={t.id}
                                onClick={() => setType(t.id)}
                                style={{
                                    border: type === t.id ? '1px solid #ededed' : '1px solid #1e1e2e',
                                    background: type === t.id ? '#18181b' : 'transparent',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <h4 style={{ color: '#ededed', margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 500 }}>{t.name}</h4>
                                <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{t.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Row 2: Name */}
                <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                    <div style={{ flex: '0 0 300px' }}>
                        <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>Name</label>
                        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                            A unique name for your contract.
                        </p>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. My Awesome Token"
                            style={{
                                width: '100%',
                                background: '#0a0a0f',
                                border: '1px solid #1e1e2e',
                                color: '#ededed',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                fontSize: '0.95rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#52525b'}
                            onBlur={e => e.target.style.borderColor = '#1e1e2e'}
                        />
                    </div>
                </div>

                {/* Row 3: Symbol (Conditional) */}
                {(type === 'erc20' || type === 'erc721') && (
                    <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                        <div style={{ flex: '0 0 300px' }}>
                            <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>
                                Symbol
                            </label>
                            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                                The ticker symbol for your contract.
                            </p>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={symbol}
                                onChange={e => setSymbol(e.target.value)}
                                placeholder="e.g. MAT"
                                style={{
                                    width: '100%',
                                    background: '#0a0a0f',
                                    border: '1px solid #1e1e2e',
                                    color: '#ededed',
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#52525b'}
                                onBlur={e => e.target.style.borderColor = '#1e1e2e'}
                            />
                        </div>
                    </div>
                )}

                {/* Row 4: Initial Supply (ERC-20 only) */}
                {type === 'erc20' && (
                    <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                        <div style={{ flex: '0 0 300px' }}>
                            <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>
                                Initial Supply
                            </label>
                            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                                The number of tokens to mint on deployment.
                            </p>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={initialSupply}
                                onChange={e => setInitialSupply(e.target.value)}
                                placeholder="e.g. 1000000"
                                style={{
                                    width: '100%',
                                    background: '#0a0a0f',
                                    border: '1px solid #1e1e2e',
                                    color: '#ededed',
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#52525b'}
                                onBlur={e => e.target.style.borderColor = '#1e1e2e'}
                            />
                        </div>
                    </div>
                )}

                {/* Row 5: Max Supply (ERC-721 only) */}
                {type === 'erc721' && (
                    <div style={{ display: 'flex', padding: '32px 0', borderBottom: '1px solid #1e1e2e', gap: '48px' }}>
                        <div style={{ flex: '0 0 300px' }}>
                            <label style={{ display: 'block', color: '#ededed', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>
                                Max Supply
                            </label>
                            <p style={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                                Maximum number of NFTs that can be minted.
                            </p>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={maxSupply}
                                onChange={e => setMaxSupply(e.target.value)}
                                placeholder="e.g. 10000"
                                style={{
                                    width: '100%',
                                    background: '#0a0a0f',
                                    border: '1px solid #1e1e2e',
                                    color: '#ededed',
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#52525b'}
                                onBlur={e => e.target.style.borderColor = '#1e1e2e'}
                            />
                        </div>
                    </div>
                )}

                {/* Row 4: Controls / Deploy Button */}
                <div style={{ display: 'flex', padding: '32px 0', gap: '48px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {status === 'error' && (
                        <div style={{ color: '#ef4444', fontSize: '0.9rem', marginRight: 'auto' }}>
                            {errorMsg}
                        </div>
                    )}
                    {status === 'success' && (
                        <div style={{ marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 500 }}>
                                ✓ Contract deployed successfully!
                            </div>
                            <div style={{ color: '#ededed', fontSize: '0.85rem' }}>
                                Address: <a href={`https://testnet.arcscan.app/address/${contractAddress}#code`} target="_blank" rel="noreferrer" style={{ color: '#ededed', textDecoration: 'underline', textUnderlineOffset: '4px', fontFamily: 'monospace' }}>{contractAddress}</a>
                            </div>
                            {txHash && (
                                <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>
                                    Tx: <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#a1a1aa', textDecoration: 'underline', textUnderlineOffset: '4px', fontFamily: 'monospace' }}>{txHash.slice(0, 14)}...{txHash.slice(-10)}</a>
                                </div>
                            )}
                            {/* Verification status */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                marginTop: '4px', fontSize: '0.8rem',
                            }}>
                                {verifyStatus === 'verifying' && (
                                    <span style={{ color: '#a1a1aa' }}>⏳ Verifying on Blockscout...</span>
                                )}
                                {verifyStatus === 'verified' && (
                                    <span style={{ color: '#22c55e' }}>✓ Verified on Blockscout</span>
                                )}
                                {verifyStatus === 'failed' && (
                                    <span style={{ color: '#a1a1aa' }}>⚠ Verification: {verifyMsg}</span>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleDeploy}
                        disabled={status === 'deploying'}
                        style={{
                            background: '#ededed',
                            color: '#0a0a0f',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '6px',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            cursor: status === 'deploying' ? 'not-allowed' : 'pointer',
                            opacity: status === 'deploying' ? 0.7 : 1,
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => { if (status !== 'deploying') e.currentTarget.style.background = '#f4f4f5' }}
                        onMouseLeave={e => { if (status !== 'deploying') e.currentTarget.style.background = '#ededed' }}
                    >
                        {status === 'deploying' ? 'Deploying...' : 'Deploy Contract'}
                    </button>
                </div>
            </div>
        </div>
    );
}

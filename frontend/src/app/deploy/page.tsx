'use client';

import React, { useState } from 'react';
import { useWallet } from '@/lib/wallet';

const CONTRACT_TYPES = [
    { id: 'erc20', name: 'ERC-20 Token', desc: 'Standard fungible token with minting.', icon: '\u2B21', color: 'var(--green)', glow: 'card-glow-green', chip: 'chip-green' },
    { id: 'erc721', name: 'ERC-721 NFT', desc: 'Non-fungible token collection.', icon: '\u25C6', color: 'var(--pink)', glow: 'card-glow-pink', chip: 'chip-pink' },
    { id: 'rewards', name: 'Airdrop', desc: 'Distribute token rewards to users.', icon: '\u2726', color: 'var(--orange)', glow: 'card-glow-orange', chip: 'chip-orange' },
    { id: 'factory', name: 'Factory', desc: 'Deterministic contract deployments.', icon: '\u2B22', color: 'var(--blue)', glow: 'card-glow-blue', chip: 'chip-blue' },
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

    const selectedType = CONTRACT_TYPES.find(t => t.id === type)!;

    const handleDeploy = async () => {
        if (!isConnected || !signer || !address) { setErrorMsg('Connect your wallet first.'); setStatus('error'); return; }
        if (!name) { setErrorMsg('Name is required.'); setStatus('error'); return; }
        if ((type === 'erc20' || type === 'erc721') && !symbol) { setErrorMsg('Symbol is required.'); setStatus('error'); return; }

        setStatus('deploying'); setErrorMsg('');

        try {
            let body: Record<string, unknown> = { owner: address };
            let verifyType = 'ERC20Token';
            let verifyArgs: unknown[] = [];

            if (type === 'erc20') { body = { name, symbol, decimals: 18, initialSupply, owner: address }; verifyType = 'ERC20Token'; verifyArgs = [name, symbol, 18, initialSupply, address]; }
            else if (type === 'erc721') { const ms = parseInt(maxSupply) || 10000; body = { name, symbol, maxSupply: ms, baseURI: '', royaltyBps: 500, owner: address }; verifyType = 'ERC721NFT'; verifyArgs = [name, symbol, ms, '', 500, address]; }
            else if (type === 'rewards') { body = { rewardToken: address, owner: address }; verifyType = 'RewardDistributor'; verifyArgs = [address, address]; }
            else if (type === 'factory') { body = { owner: address }; verifyType = 'DeploymentFactory'; verifyArgs = [address]; }

            const message = `ARC-Portal:${JSON.stringify(body)}`;
            const signature = await signMessage(message);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/deploy/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-wallet-address': address, 'x-wallet-signature': signature },
                body: JSON.stringify(body),
            });

            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Deployment failed'); }
            const deployData = await res.json();

            const tx = await signer.sendTransaction({ data: deployData.transaction.data, gasLimit: deployData.transaction.gasEstimate || '3000000' });
            setTxHash(tx.hash);
            const receipt = await tx.wait();

            if (receipt?.contractAddress) { setContractAddress(receipt.contractAddress); setStatus('success'); autoVerify(receipt.contractAddress, verifyType, verifyArgs); }
            else { throw new Error('No contract address in receipt'); }
        } catch (err: any) { console.error(err); setErrorMsg(err.message || 'Deployment failed'); setStatus('error'); }
    };

    const autoVerify = async (addr: string, contractType: string, constructorArgs: unknown[]) => {
        setVerifyStatus('verifying'); setVerifyMsg('Submitting to Blockscout...');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/deploy/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractAddress: addr, contractType, constructorArgs }) });
            const data = await res.json();
            if (data.verified) { setVerifyStatus('verified'); setVerifyMsg(data.message || 'Verified!'); }
            else { setVerifyStatus('failed'); setVerifyMsg(data.error || data.message || 'Verification failed'); }
        } catch (err: any) { setVerifyStatus('failed'); setVerifyMsg(err.message); }
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px', position: 'relative' }}>
            <div className="orb orb-orange" style={{ width: 350, height: 350, top: -80, right: -80 }} />
            <div className="orb orb-green" style={{ width: 250, height: 250, bottom: 100, left: -80 }} />

            <header className="animate-fade-up" style={{ marginBottom: 48 }}>
                <h1 className="heading-xl text-gradient-sunset">Deploy</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 500, marginTop: 8 }}>Deploy verified smart contracts to ARC Testnet in one click.</p>
            </header>

            <section className="animate-fade-up delay-1" style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <span className="heading-md">Contract Type</span>
                    <span className={`chip ${selectedType.chip}`}>{selectedType.name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {CONTRACT_TYPES.map(t => (
                        <div key={t.id} onClick={() => setType(t.id)}
                            className={`card ${type === t.id ? t.glow : ''}`}
                            style={{ cursor: 'pointer', borderColor: type === t.id ? t.color : 'var(--border)', position: 'relative', overflow: 'hidden', padding: 20 }}>
                            {type === t.id && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: t.color }} />}
                            <div style={{ fontSize: '1.5rem', marginBottom: 10, color: type === t.id ? t.color : 'var(--text-muted)' }}>{t.icon}</div>
                            <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600 }}>{t.name}</h4>
                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.82rem', lineHeight: 1.5 }}>{t.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card animate-fade-up delay-2" style={{ marginBottom: 32, padding: 0 }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
                    <h3 className="heading-md" style={{ margin: 0 }}>Configuration</h3>
                </div>

                <div style={{ display: 'flex', padding: '24px 28px', borderBottom: '1px solid var(--border)', gap: 48 }}>
                    <div style={{ flex: '0 0 240px' }}>
                        <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 500, marginBottom: 4 }}>Name</label>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>A unique name for your contract.</p>
                    </div>
                    <div style={{ flex: 1 }}><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Awesome Token" className="input" /></div>
                </div>

                {(type === 'erc20' || type === 'erc721') && (
                    <div style={{ display: 'flex', padding: '24px 28px', borderBottom: '1px solid var(--border)', gap: 48 }}>
                        <div style={{ flex: '0 0 240px' }}>
                            <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 500, marginBottom: 4 }}>Symbol</label>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>The ticker symbol.</p>
                        </div>
                        <div style={{ flex: 1 }}><input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g. MAT" className="input" /></div>
                    </div>
                )}

                {type === 'erc20' && (
                    <div style={{ display: 'flex', padding: '24px 28px', borderBottom: '1px solid var(--border)', gap: 48 }}>
                        <div style={{ flex: '0 0 240px' }}>
                            <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 500, marginBottom: 4 }}>Initial Supply</label>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Tokens minted on deploy.</p>
                        </div>
                        <div style={{ flex: 1 }}><input type="text" value={initialSupply} onChange={e => setInitialSupply(e.target.value)} placeholder="1000000" className="input" /></div>
                    </div>
                )}

                {type === 'erc721' && (
                    <div style={{ display: 'flex', padding: '24px 28px', borderBottom: '1px solid var(--border)', gap: 48 }}>
                        <div style={{ flex: '0 0 240px' }}>
                            <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 500, marginBottom: 4 }}>Max Supply</label>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Maximum NFTs mintable.</p>
                        </div>
                        <div style={{ flex: 1 }}><input type="text" value={maxSupply} onChange={e => setMaxSupply(e.target.value)} placeholder="10000" className="input" /></div>
                    </div>
                )}

                <div style={{ display: 'flex', padding: '24px 28px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        {status === 'error' && <span style={{ color: '#ef4444', fontSize: '0.88rem' }}>{errorMsg}</span>}
                        {status === 'success' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="status-dot status-dot-live" />
                                    <span style={{ color: 'var(--green)', fontSize: '0.9rem', fontWeight: 600 }}>Deployed!</span>
                                </div>
                                <a href={`https://testnet.arcscan.app/address/${contractAddress}#code`} target="_blank" rel="noreferrer"
                                    style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '0.82rem', color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>{contractAddress}</a>
                                {txHash && <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noreferrer"
                                    style={{ fontFamily: 'Space Grotesk, monospace', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Tx: {txHash.slice(0, 14)}...{txHash.slice(-10)}</a>}
                                <div style={{ fontSize: '0.78rem', marginTop: 2 }}>
                                    {verifyStatus === 'verifying' && <span style={{ color: 'var(--orange)' }}>Verifying...</span>}
                                    {verifyStatus === 'verified' && <span style={{ color: 'var(--green)' }}>Verified on Blockscout</span>}
                                    {verifyStatus === 'failed' && <span style={{ color: 'var(--text-muted)' }}>{verifyMsg}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleDeploy} disabled={status === 'deploying'} className="btn btn-primary"
                        style={{ padding: '12px 32px', fontSize: '0.95rem', opacity: status === 'deploying' ? 0.6 : 1, cursor: status === 'deploying' ? 'not-allowed' : 'pointer' }}>
                        {status === 'deploying' ? 'Deploying...' : 'Deploy Contract'}
                    </button>
                </div>
            </section>
        </div>
    );
}
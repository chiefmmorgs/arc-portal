const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE = `${API_URL}/api`;

export interface Validator {
    id: number;
    address: string;
    total_blocks: number;
    missed_blocks: number;
    uptime_percentage: string;
    created_at: string;
}

export interface ValidatorStats {
    total_validators: string;
    avg_uptime: string;
    total_blocks: string;
    total_missed: string;
}

export interface Template {
    name: string;
    description: string;
}

export interface DeployResult {
    template: string;
    transaction: {
        data: string;
        gasEstimate: string;
        gasPrice: string;
        chainId: number;
    };
    constructorArgs: unknown[];
}

export interface UploadResult {
    cid: string;
    ipfsUri: string;
    gatewayUrl: string;
    metadataUri?: string;
    fileName?: string;
    size?: number;
}

export interface HealthStatus {
    status: string;
    service: string;
    timestamp: string;
    indexer: {
        running: boolean;
        lastBlock: number;
    };
}

// ── Health ────────────────────────────────────
export async function fetchHealth(): Promise<HealthStatus> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/health`);
    return res.json();
}

// ── Validators ────────────────────────────────
export async function fetchValidators(): Promise<Validator[]> {
    const res = await fetch(`${API_BASE}/validators`);
    const data = await res.json();
    return data.validators;
}

export async function fetchValidatorStats(): Promise<ValidatorStats> {
    const res = await fetch(`${API_BASE}/validators/stats`);
    const data = await res.json();
    return data.stats;
}

export async function fetchValidatorRewards(address: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/validators/${address}/rewards`);
    const data = await res.json();
    return data.rewards;
}

export async function exportValidatorsCSV(): Promise<string> {
    const res = await fetch(`${API_BASE}/validators/export`);
    return res.text();
}

// ── Deploy ────────────────────────────────────
export async function fetchTemplates(): Promise<Template[]> {
    const res = await fetch(`${API_BASE}/deploy/templates`);
    const data = await res.json();
    return data.templates;
}

export async function deployContract(
    type: 'erc20' | 'erc721' | 'rewards' | 'factory',
    body: Record<string, unknown>,
    walletAddress: string,
    signature: string
): Promise<DeployResult> {
    const res = await fetch(`${API_BASE}/deploy/${type}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': walletAddress,
            'x-wallet-signature': signature,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Deployment failed');
    }
    return res.json();
}

// ── Upload ────────────────────────────────────
export async function uploadImage(file: File, owner: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('owner', owner);
    const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
    }
    return res.json();
}

export async function uploadMetadata(metadata: {
    name: string;
    description: string;
    image: string;
    attributes: { trait_type: string; value: string }[];
    owner: string;
}): Promise<UploadResult> {
    const res = await fetch(`${API_BASE}/upload/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Metadata upload failed');
    }
    return res.json();
}

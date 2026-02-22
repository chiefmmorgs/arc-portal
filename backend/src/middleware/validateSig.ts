import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import { logger } from "./logger";

/**
 * Middleware to validate EIP-712 / personal_sign wallet signatures.
 * Ensures that the deployer actually controls the wallet.
 *
 * Expected headers:
 *   x-wallet-address: The signer's address
 *   x-wallet-signature: Signature of the request body (JSON stringified)
 *
 * The message signed must be: `ARC-Portal:${JSON.stringify(req.body)}`
 */
export function validateWalletSignature(req: Request, res: Response, next: NextFunction): void {
    const address = req.headers["x-wallet-address"] as string | undefined;
    const signature = req.headers["x-wallet-signature"] as string | undefined;

    if (!address || !signature) {
        res.status(401).json({
            error: "Missing wallet signature headers (x-wallet-address, x-wallet-signature)",
        });
        return;
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
        res.status(400).json({ error: "Invalid wallet address format" });
        return;
    }

    try {
        // Reconstruct the signed message
        const message = `ARC-Portal:${JSON.stringify(req.body)}`;
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            logger.warn("Signature verification failed", {
                expected: address,
                recovered: recoveredAddress,
            });
            res.status(403).json({ error: "Wallet signature verification failed" });
            return;
        }

        // Attach verified address to request
        (req as any).verifiedAddress = recoveredAddress;
        logger.info("Wallet signature verified", { address: recoveredAddress });
        next();
    } catch (err) {
        logger.error("Signature validation error", {
            error: err instanceof Error ? err.message : String(err),
        });
        res.status(400).json({ error: "Invalid signature" });
    }
}

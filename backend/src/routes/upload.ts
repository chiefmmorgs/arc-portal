import { Router, Request, Response } from "express";
import multer from "multer";
import { insertNFT } from "../modules/db";
import { uploadLimiter } from "../middleware/rateLimit";
import { logger } from "../middleware/logger";

const router = Router();
router.use(uploadLimiter);

// Multer config: store files in memory for Pinata upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    },
});

/**
 * Upload a file to Pinata IPFS.
 */
async function uploadToPinata(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<string> {
    const jwt = process.env.PINATA_JWT;
    if (!jwt || jwt === "your_pinata_jwt_here") {
        throw new Error("PINATA_JWT not configured in .env");
    }

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, fileName);

    const pinataMetadata = JSON.stringify({ name: fileName });
    formData.append("pinataMetadata", pinataMetadata);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${jwt}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { IpfsHash: string };
    return data.IpfsHash;
}

/**
 * Upload JSON metadata to Pinata IPFS.
 */
async function uploadJSONToPinata(metadata: object, name: string): Promise<string> {
    const jwt = process.env.PINATA_JWT;
    if (!jwt || jwt === "your_pinata_jwt_here") {
        throw new Error("PINATA_JWT not configured in .env");
    }

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            pinataContent: metadata,
            pinataMetadata: { name },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata JSON upload failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { IpfsHash: string };
    return data.IpfsHash;
}

/**
 * POST /api/upload/image
 * Upload an image file to Pinata IPFS.
 *
 * Multipart form: file (image), owner (wallet address)
 */
router.post("/image", upload.single("file"), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const owner = req.body.owner;

        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        if (!owner) {
            res.status(400).json({ error: "Owner address required" });
            return;
        }

        logger.info("Uploading image to Pinata", {
            fileName: file.originalname,
            size: file.size,
            owner,
        });

        const cid = await uploadToPinata(file.buffer, file.originalname, file.mimetype);
        const ipfsUri = `ipfs://${cid}`;
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

        // Store reference in DB
        await insertNFT(owner, ipfsUri);

        logger.info("Image uploaded successfully", { cid, owner });

        res.json({
            cid,
            ipfsUri,
            gatewayUrl,
            fileName: file.originalname,
            size: file.size,
        });
    } catch (err) {
        logger.error("Image upload failed", { error: (err as Error).message });
        res.status(500).json({ error: (err as Error).message });
    }
});

/**
 * POST /api/upload/metadata
 * Upload NFT metadata JSON to Pinata IPFS.
 *
 * Body: { name, description, image (IPFS URI), attributes[], owner }
 */
router.post("/metadata", async (req: Request, res: Response) => {
    try {
        const { name, description, image, attributes, owner } = req.body;

        if (!name || !image || !owner) {
            res.status(400).json({ error: "Missing required fields: name, image, owner" });
            return;
        }

        const metadata = {
            name,
            description: description || "",
            image,
            attributes: attributes || [],
        };

        logger.info("Uploading metadata to Pinata", { name, owner });

        const cid = await uploadJSONToPinata(metadata, `${name}-metadata`);
        const metadataUri = `ipfs://${cid}`;
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

        // Store in DB
        await insertNFT(owner, metadataUri);

        logger.info("Metadata uploaded successfully", { cid, owner });

        res.json({
            cid,
            metadataUri,
            gatewayUrl,
            metadata,
        });
    } catch (err) {
        logger.error("Metadata upload failed", { error: (err as Error).message });
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;

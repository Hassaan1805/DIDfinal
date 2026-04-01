"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDidDocument = resolveDidDocument;
const SepoliaService_1 = require("./SepoliaService");
const DID_ETHR_REGEX = /^did:ethr:(0x[a-fA-F0-9]{40})$/;
function parseDidEthr(did) {
    const trimmed = did.trim();
    const match = trimmed.match(DID_ETHR_REGEX);
    if (!match) {
        throw new Error('Invalid DID format. Expected did:ethr:0x...');
    }
    return match[1];
}
function parseOptionalPublicKeyJwk(raw) {
    if (!raw || !raw.trim()) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
async function resolveDidDocument(did) {
    const address = parseDidEthr(did);
    const didInfo = await SepoliaService_1.sepoliaService.getEmployeeDIDInfo(address);
    if (!didInfo.success || !didInfo.didInfo) {
        throw new Error(didInfo.error || 'DID not found on-chain');
    }
    const canonicalDid = didInfo.didInfo.did || `did:ethr:${address.toLowerCase()}`;
    const methodId = `${canonicalDid}#controller`;
    const publicKeyJwk = parseOptionalPublicKeyJwk(didInfo.didInfo.publicKeyJwk);
    return {
        '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/secp256k1recovery-2020/v2',
        ],
        id: canonicalDid,
        verificationMethod: [
            {
                id: methodId,
                type: 'EcdsaSecp256k1RecoveryMethod2020',
                controller: canonicalDid,
                blockchainAccountId: `eip155:11155111:${address.toLowerCase()}`,
                ...(publicKeyJwk ? { publicKeyJwk } : {}),
            },
        ],
        authentication: [methodId],
        assertionMethod: [methodId],
        metadata: {
            registrationDate: didInfo.didInfo.registrationDate,
            isActive: didInfo.didInfo.isActive,
            authCount: didInfo.didInfo.authCount,
        },
    };
}
//# sourceMappingURL=didResolver.service.js.map
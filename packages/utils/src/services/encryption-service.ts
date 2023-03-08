import * as fs from 'fs';
import { decryptStringWithRsaPrivateKey } from '../scripts/securedsettings';

let DECRYPT_KEY_FILE = process.env.DECRYPT_KEY_FILE || "/run/secrets/decrypt_key";

class Decrypt {
    decrypt(encryptedData: string): string {
        if (!fs.existsSync(DECRYPT_KEY_FILE)) {
            throw new Error(`Decrypt key file not found at ${DECRYPT_KEY_FILE}`);
        }

        return decryptStringWithRsaPrivateKey(encryptedData, DECRYPT_KEY_FILE);
    }
}

export let EncryptionService = new Decrypt();
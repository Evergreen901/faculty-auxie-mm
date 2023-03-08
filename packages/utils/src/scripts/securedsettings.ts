import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { writeFileSync } from 'fs';
import { generateKeyPairSync } from 'crypto';
const passphrase = 'mySecret';

const encryptStringWithRsaPublicKey = function(toEncrypt, relativeOrAbsolutePathToPublicKey) {
    const absolutePath = path.resolve(relativeOrAbsolutePathToPublicKey);
    const publicKey = fs.readFileSync(absolutePath, 'utf8');
    const buffer = Buffer.from(toEncrypt);
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
};

const decryptStringWithRsaPrivateKey = function(toDecrypt, relativeOrAbsolutePathtoPrivateKey) {
    const absolutePath = path.resolve(relativeOrAbsolutePathtoPrivateKey);
    const privateKey = fs.readFileSync(absolutePath, 'utf8');
    const buffer = Buffer.from(toDecrypt, 'base64');
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey.toString(),
            passphrase: passphrase,
        },
        buffer,
    );
    return decrypted.toString('utf8');
};

function generateKeys() {
    const { publicKey, privateKey } = generateKeyPairSync('rsa',
        {
            modulusLength: 4096,
            // namedCurve: 'secp256k1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase: passphrase
            }
        });
    writeFileSync('private.pem', privateKey);
    writeFileSync('public.pem', publicKey);
}

export {
    decryptStringWithRsaPrivateKey,
    generateKeys,
    encryptStringWithRsaPublicKey
};

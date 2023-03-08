import { encryptStringWithRsaPublicKey } from '../../utils/src/scripts/securedsettings';

const ENCRYPTION_KEY_FILE = process.env.ENCRYPTION_KEY_FILE ?? "public.pem";

(async () => {
    if (process.argv.length < 3) {
        console.log("No input detected.\nUsage: npm run encrypt <data>\n");
        return;
    }
    let data = process.argv[2];

    console.log(encryptStringWithRsaPublicKey(data, ENCRYPTION_KEY_FILE));
})();
import { ethers } from 'ethers';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getEncryptKey(): Buffer {
  const salt = process.env.ENCRYPT_SALT || 'dailaunch-default-salt';
  return crypto.createHash('sha256').update(salt).digest();
}

export function encryptKey(privateKey: string): string {
  const key = getEncryptKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptKey(encryptedData: string): string {
  const [ivHex, encryptedHex] = encryptedData.split(':');
  const key = getEncryptKey();
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
}

export function generateWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

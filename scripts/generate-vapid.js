/**
 * VAPID Key Generation Utility for BiteBuddy 2.0 Web Push
 * Run with: node scripts/generate-vapid.js
 */

const crypto = require('crypto');

function generateVAPIDKeys() {
  const curve = crypto.createECDH('prime256v1');
  curve.generateKeys();

  const publicKey = curve.getPublicKey('base64url');
  const privateKey = curve.getPrivateKey('base64url');

  console.log('\n========================================');
  console.log('  BITEBUDDY 2.0 — VAPID KEYS GENERATED  ');
  console.log('========================================\n');
  console.log('Add these to your .env / .env.local:\n');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${privateKey}"`);
  console.log(`VAPID_SUBJECT="mailto:support@bitebuddy.app"\n`);
  console.log('========================================\n');
}

generateVAPIDKeys();

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Copy CJS entry
const cjsSource = fs.readFileSync(path.join(__dirname, 'src', 'index.js'), 'utf8');
fs.writeFileSync(path.join(distDir, 'index.cjs.js'), cjsSource);

// 2. Build ESM entry
const esmSource = `
import crypto from 'crypto';

${cjsSource.replace(/module\.exports = {[\s\S]*?};/, '')}

export { ClusterPay, verifyWebhookSignature };
export default ClusterPay;
`.trim();
fs.writeFileSync(path.join(distDir, 'index.esm.js'), esmSource);

// 3. Copy TypeScript declarations
const dtsSource = fs.readFileSync(path.join(__dirname, 'src', 'index.d.ts'), 'utf8');
fs.writeFileSync(path.join(distDir, 'index.d.ts'), dtsSource);

// 4. Copy Browser Modal SDK
if (fs.existsSync(path.join(__dirname, 'clusterpay.js'))) {
  fs.copyFileSync(path.join(__dirname, 'clusterpay.js'), path.join(distDir, 'clusterpay.browser.js'));
}

console.log('✅ @clusterpay/sdk dist build completed successfully.');

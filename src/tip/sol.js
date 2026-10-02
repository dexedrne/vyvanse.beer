// Tipping SOL from a browser wallet (Phantom, Solflare, Backpack and anything else that speaks
// the Wallet Standard). The transfer is built here by hand, one System Program instruction, so
// none of @solana/web3.js has to load. Only loaded when someone presses "connect wallet & send".
import { sol } from './config.js';
import { b58encode, b58decode, b64encode, b64decode } from './b58.js';

const CHAIN = 'solana:mainnet';
const found = new Set();

// Wallet Standard handshake: wallets already on the page answer app-ready, later ones announce.
const api = Object.freeze({
  register(...ws) {
    ws.forEach((w) => found.add(w));
    return () => ws.forEach((w) => found.delete(w));
  },
});
window.addEventListener('wallet-standard:register-wallet', ({ detail }) => detail?.(api));
window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: api }));

export function wallets() {
  return [...found]
    .filter(
      (w) =>
        w.chains?.includes(CHAIN) &&
        w.features?.['standard:connect'] &&
        (w.features['solana:signAndSendTransaction'] || w.features['solana:signTransaction']),
    )
    .map((w) => ({ name: w.name, icon: w.icon, w }));
}

// Asks each public RPC in turn until one answers (busy, refusing or down: next one). An answer
// that is an error (say, a transaction the network won't take) is final.
async function rpc(method, params) {
  let last;
  for (const url of sol.rpcs) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (r.status === 429 || r.status === 403 || r.status >= 500) throw new Error(r.status === 429 ? '429 too many requests' : `RPC ${r.status}`);
      const j = await r.json();
      if (j.error) throw Object.assign(new Error(j.error.message || 'RPC error'), { final: true });
      return j.result;
    } catch (e) {
      if (e.final) throw e;
      last = e;
    }
  }
  throw last;
}

// A legacy transaction, unsigned: header, [from, to, System Program], blockhash, one transfer.
function transferTx(from, to, lamports, blockhash) {
  const data = new Uint8Array(12);
  const dv = new DataView(data.buffer);
  dv.setUint32(0, 2, true); // SystemInstruction::Transfer
  dv.setBigUint64(4, lamports, true);
  return Uint8Array.from([
    1, ...new Uint8Array(64), // one signature slot
    1, 0, 1, // 1 signer, 0 read-only signed, 1 read-only unsigned
    3, ...from, ...to, ...new Uint8Array(32),
    ...blockhash,
    1, 2, 2, 0, 1, 12, ...data,
  ]);
}

// The live re-check: same answer as at build time? 'ok', 'changed' (with what), or 'unknown'.
export async function recheck() {
  const keys = [sol.sns.domain, sol.sns.recordV1, sol.sns.recordV2];
  const res = await rpc('getMultipleAccounts', [keys, { encoding: 'base64', commitment: 'confirmed' }]);
  const [dom, v1, v2] = res.value.map((a) => (a ? b64decode(a.data[0]) : null));
  if (!dom) return { state: 'changed', note: 'vyvanse.sol no longer exists' };
  const owner = b58encode(dom.slice(32, 64));
  // A SOL record wins over the owner: v2 keeps the address last, v1 right after the 96-byte header.
  const rec = v2 ? b58encode(v2.slice(-32)) : v1 ? b58encode(v1.slice(96, 128)) : null;
  const live = rec || (owner === sol.sns.nft ? null : owner);
  if (!live) return { state: 'changed', note: 'vyvanse.sol is wrapped as an NFT now' };
  return live === sol.address ? { state: 'ok' } : { state: 'changed', note: `vyvanse.sol points to ${live} now` };
}

export async function send(wallet, lamports, onStep) {
  const w = wallet.w;
  onStep('Approve the connection in your wallet…');
  const { accounts } = await w.features['standard:connect'].connect();
  const account = accounts.find((a) => a.chains?.includes(CHAIN)) || accounts[0];
  if (!account) throw new Error('no account');
  if (account.address === sol.address) throw new Error('that’s the tip jar’s own wallet');

  onStep('Getting a recent blockhash…');
  const { value } = await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }]);
  const tx = transferTx(account.publicKey, b58decode(sol.address), lamports, b58decode(value.blockhash));

  onStep('Approve the tip in your wallet…');
  let sig;
  const sas = w.features['solana:signAndSendTransaction'];
  if (sas) {
    const [out] = await sas.signAndSendTransaction({ account, chain: CHAIN, transaction: tx });
    sig = b58encode(out.signature);
  } else {
    const [out] = await w.features['solana:signTransaction'].signTransaction({ account, chain: CHAIN, transaction: tx });
    sig = await rpc('sendTransaction', [b64encode(out.signedTransaction), { encoding: 'base64' }]);
  }

  onStep('Sent. Waiting for the network to confirm…', sol.explorer.tx(sig));
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const st = (await rpc('getSignatureStatuses', [[sig]])).value[0];
      if (st?.err) throw Object.assign(new Error('the transfer failed on-chain, so nothing moved'), { landed: true });
      if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return { done: true, url: sol.explorer.tx(sig) };
    } catch (e) {
      if (e.landed) throw e;
    }
  }
  return { done: false, url: sol.explorer.tx(sig) };
}

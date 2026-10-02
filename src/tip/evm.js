// Tipping ETH from an injected EVM wallet (MetaMask, Rabby, Robinhood Wallet's browser, …), found
// through EIP-6963 with window.ethereum as the fallback. Plain EIP-1193 calls, no library.
// Only loaded when someone presses "connect wallet & send".
import { eth } from './config.js';

const found = new Map();
window.addEventListener('eip6963:announceProvider', (e) => {
  const d = e.detail;
  if (d?.info?.uuid && d.provider) found.set(d.info.uuid, d);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

export function wallets() {
  const list = [...found.values()].map((d) => ({ name: d.info.name, icon: d.info.icon, p: d.provider }));
  if (!list.length && window.ethereum?.request) list.push({ name: 'Browser wallet', icon: null, p: window.ethereum });
  return list;
}

const hex = (n) => `0x${n.toString(16)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function toChain(p, chain) {
  if (Number(await p.request({ method: 'eth_chainId' })) === chain.id) return;
  try {
    await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex(chain.id) }] });
  } catch (e) {
    const code = e?.code ?? e?.data?.originalError?.code;
    if (!chain.add || !(code === 4902 || /unrecognized|not been added|unknown chain|not added/i.test(e?.message || ''))) throw e;
    await p.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: hex(chain.id), nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, ...chain.add }],
    });
  }
  if (Number(await p.request({ method: 'eth_chainId' })) !== chain.id) throw new Error(`your wallet is still on another network; switch it to ${chain.label}`);
}

export async function send(wallet, wei, chain, onStep) {
  const p = wallet.p;
  onStep('Approve the connection in your wallet…');
  const [from] = await p.request({ method: 'eth_requestAccounts' });
  if (!from) throw new Error('no account');
  if (from.toLowerCase() === eth.address.toLowerCase()) throw new Error('that’s the tip jar’s own wallet');

  onStep(`Switching your wallet to ${chain.label}…`);
  await toChain(p, chain);

  onStep('Approve the tip in your wallet…');
  const hash = await p.request({ method: 'eth_sendTransaction', params: [{ from, to: eth.address, value: hex(wei) }] });
  const url = chain.explorer.tx(hash);

  onStep('Sent. Waiting for it to land in a block…', url);
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    try {
      const r = await p.request({ method: 'eth_getTransactionReceipt', params: [hash] });
      if (r?.status === '0x1') return { done: true, url };
      if (r?.status === '0x0') return { failed: true, url };
    } catch {
      // the wallet's RPC hiccupped; keep waiting
    }
  }
  return { done: false, url };
}

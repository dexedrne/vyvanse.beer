// The tip jar (src/tip/panel.js). Addresses are baked in here so visitors can check them
// against what their wallet shows before they approve anything.

// vyvanse.sol, resolved the way wallets do it (SNS: the domain's SOL record if it has a valid
// one, otherwise whoever owns the domain). On 2026-10-02 it had no SOL record (v1 or v2) and
// wasn't wrapped as an NFT, so it resolves to the domain's owner. The panel re-reads these
// accounts from a public RPC when it opens and won't send if the answer has changed.
export const sol = {
  coin: 'SOL',
  name: 'vyvanse.sol',
  address: 'EudnVdNqqDnbdXBbuUVL1uRLGqUUEfVoaD9fDsFAtWwV',
  sns: {
    domain: 'CCMLWtg2cPKkSsg9RaiAg1AD1KM19GRhxTxgCWKPCfAr', // name account: owner at bytes 32..64
    recordV1: 'EczKiDpErrKqTJT9X9DMnvCPwZ8XZPiMDZevmcyMGTsJ', // SOL record v1
    recordV2: 'CvUDE1czYomYbLPemaxFcGsizwJ6zhEwqbQkyZ2ghCg4', // SOL record v2
    nft: 'CBYCxp9VacpFbzYfupKvnSpK75WSLZp5zkgFYNZnSrFt', // owns the name while it's wrapped
  },
  // Public mainnet RPCs that answer browsers (CORS) without a key, tried in order. The Solana
  // Foundation's api.mainnet-beta.solana.com refuses requests from web pages, so it's last.
  rpcs: ['https://solana-rpc.publicnode.com', 'https://solana-mainnet.gateway.tatum.io', 'https://api.mainnet-beta.solana.com'],
  amounts: ['0.05', '0.1', '0.5'],
  pick: '0.1',
  decimals: 9,
  explorer: { name: 'Solscan', tx: (sig) => `https://solscan.io/tx/${sig}` },
};

// One EVM wallet, the same address on all three chains.
export const eth = {
  coin: 'ETH',
  address: '0x9d506bA29843a232409d85E289edeCe8D6a7b452',
  amounts: ['0.005', '0.01', '0.05'],
  pick: '0.01',
  decimals: 18,
  chains: [
    {
      key: 'ethereum',
      label: 'Ethereum',
      id: 1,
      explorer: { name: 'Etherscan', tx: (h) => `https://etherscan.io/tx/${h}` },
    },
    {
      key: 'arbitrum',
      label: 'Arbitrum',
      id: 42161,
      explorer: { name: 'Arbiscan', tx: (h) => `https://arbiscan.io/tx/${h}` },
      add: { chainName: 'Arbitrum One', rpcUrls: ['https://arb1.arbitrum.io/rpc'], blockExplorerUrls: ['https://arbiscan.io'] },
    },
    {
      key: 'robinhood',
      label: 'Robinhood Chain',
      id: 4663,
      explorer: { name: 'Blockscout', tx: (h) => `https://robinhoodchain.blockscout.com/tx/${h}` },
      add: {
        chainName: 'Robinhood Chain',
        rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
        blockExplorerUrls: ['https://robinhoodchain.blockscout.com'],
      },
    },
  ],
};

// '0.1' -> 100000000n at 9 decimals. Null for anything that isn't a plain positive amount.
export function toUnits(text, decimals) {
  const m = /^(\d*)(?:\.(\d*))?$/.exec(String(text).trim().replace(',', '.'));
  if (!m || (!m[1] && !m[2])) return null;
  const frac = m[2] || '';
  if (frac.length > decimals) return null;
  const v = BigInt((m[1] || '0') + frac.padEnd(decimals, '0'));
  return v > 0n ? v : null;
}

export const short = (a) => `${a.slice(0, a.startsWith('0x') ? 6 : 4)}…${a.slice(-4)}`;

// Payment links for phone wallets: Solana Pay and EIP-681.
export function payLink(coin, amount, chain) {
  if (coin === 'SOL') {
    const units = toUnits(amount, sol.decimals);
    return `solana:${sol.address}${units ? `?amount=${fromUnits(units, sol.decimals)}&` : "?"}label=vyvanse.beer&message=tip`;
  }
  const wei = toUnits(amount, 18);
  return `ethereum:${eth.address}@${chain.id}${wei ? `?value=${wei}` : ''}`;
}

// Errors from wallets, in words. Rejections aren't failures.
export function why(err) {
  const msg = String(err?.message || err || '');
  if (err?.code === 4001 || /reject|denied|declin|cancel/i.test(msg)) return { cancelled: true, text: 'Cancelled in your wallet. No worries.' };
  if (/429|too many|rate/i.test(msg)) return { text: 'The public RPC is busy right now. Try again in a minute, or scan the QR with your phone.' };
  if (/insufficient|not enough|balance/i.test(msg)) return { text: 'Not enough in that wallet for this amount plus fees.' };
  if (/fetch|network/i.test(msg)) return { text: 'Couldn’t reach the network. Check your connection and try again.' };
  return { text: msg ? `That didn’t go through: ${msg.slice(0, 140)}` : 'That didn’t go through. Try again?' };
}

// 100000000n at 9 decimals -> '0.1'
export function fromUnits(v, decimals) {
  const s = v.toString().padStart(decimals + 1, '0');
  const frac = s.slice(-decimals).replace(/0+$/, '');
  return s.slice(0, -decimals) + (frac ? `.${frac}` : '');
}

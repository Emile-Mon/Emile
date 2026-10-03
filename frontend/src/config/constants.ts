export const PROJECT_NAME = 'Epoch Labs';
export const EPOCH_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xb71463fbe6a6edef8d9d8cb0ccb5ab84cd0a353e';
export const EPOCH_SYMBOL = '$EPC';
export const EPOCH_CHAIN = 'Robinhood Chain Mainnet';
export const NETWORK = 'mainnet';

// Backward compatibility aliases
export const EMILE_CONTRACT_ADDRESS = EPOCH_CONTRACT_ADDRESS;
export const EMILE_SYMBOL = EPOCH_SYMBOL;
export const EMILE_CHAIN = EPOCH_CHAIN;

export const getApiBaseUrl = (): string => {
  const url =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    '';
  return url.replace(/\/+$/, '');
};

export const getWsBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_WS_BASE_URL) {
    return process.env.NEXT_PUBLIC_WS_BASE_URL.replace(/\/+$/, '');
  }
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    return apiBase.replace(/^http(s?):/, 'ws$1:');
  }
  if (typeof window !== 'undefined') {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}`;
  }
  return 'ws://localhost:8000';
};

export const TreasuryABI = [
  'function transferIn(uint256 amount_) external returns (address from, uint256 amount)',
  'function transferOut(bytes calldata message, bytes calldata signature) external',
  'event TransferredIn(address indexed from, uint256 amount)',
  'event TransferredOut(uint256 indexed id, address indexed from, address indexed to, uint256 amount, uint256 deadline)',
];

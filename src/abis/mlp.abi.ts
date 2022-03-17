export const MiniLiquidityProviderABI = [
  'function getLpTokenAddress() view external returns (address)',
  'function lock(uint256 amountOutMin, uint256 deadline) external payable',
  'function unlock(uint256 lockIndex, uint256 lockID, uint256 lockAmount, uint256 amountAMin, uint256 amountBMin, uint256 amountOutMin, uint256 deadline) external',
  'function getTotalValueLocked() view external returns (uint256  totalWBNB, uint256 totalHUDI)',
];

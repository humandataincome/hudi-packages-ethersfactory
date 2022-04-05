export const MiniLiquidityProviderABI = [
  'function getLpTokenAddress() view external returns (address)',
  'function getLPTokensOut(uint256 amount) public view returns (uint256 lpTokensAmount)',
  'function addLiquidity(uint256 amountOutMin, uint256 deadline) external payable returns (uint256 amountA, uint256 amountB, uint256 liquidity)',
  'function removeLiquidity(uint256 amountToRemove, uint256 amountTokenMin, uint256 amountETHMin, uint256 deadline)',
];

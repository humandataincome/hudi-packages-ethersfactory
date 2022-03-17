export const ProxyUtilsABI = [
  'function transferToken(address tokenAddress, address to, uint256 amount) external',
  'function batchTransferToken(address tokenAddress, address[] memory recipients, uint256[] memory amounts) external',
  'function batchTransferTokens(address[] memory tokens, address[] memory recipients, uint256[] memory amounts) external',
  'function swapETHForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata paths, address to, uint256 deadline) payable external',
  'function swapTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata paths, address to, uint256 deadline) external',
  'function batchSwapTokensForETH(uint256[] calldata amountsIn, uint256[] calldata amountOutMins, address[][] calldata paths, address[] calldata tos, uint256[] calldata deadlines) external',
  'function batchSwapTokensForTokens(uint256[] calldata amountsIn, uint256[] calldata amountsOutMin, address[][] calldata paths, address[] calldata tos, uint256[] calldata deadlines) external',
];

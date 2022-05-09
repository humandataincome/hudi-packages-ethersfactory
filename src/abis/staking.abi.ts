export const StakingABI = [
  'function getRewardsEarned() public view returns (uint)',
  'function stake(uint256 amount) external updateReward(msg.sender) returns (bool)',
  'function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) returns (bool)',
  'function claimRewards() public nonReentrant updateReward(msg.sender) returns (bool)',
  'function withdrawAndClaim() external returns (bool)',
  'function getStakingTotalSupply() view external returns (uint256)',
  'function getStake() view external returns (Stake memory)'
];

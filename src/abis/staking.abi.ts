export const StakingABI = [
  'function getStakingTokenAddress() public view returns (address)',
  'function getRewardTokenAddress() public view returns (address)',
  'function stakingToken() public view returns (IERC20)',
  'function rewardToken() public view returns (IERC20)',
  'function rewardPerToken() public view returns (uint256)',
  'function stakingMinAmount() public view returns (uint256)',
  'function stakingMaxAmount() public view returns (uint256)',
  'function withdrawLockPeriod() public view returns (uint256)',
  'function getRewardsEarned() public view returns (uint)',
  'function stake(uint256 amount) external returns (bool)',
  'function withdraw(uint256 amount) public returns (bool)',
  'function claimRewards() public returns (bool)',
  'function withdrawAndClaim() external returns (bool)',
  'function getAPR() public view returns (uint)',
  'function getStakingTotalSupply() view external returns (uint256)',
  'function getStakeInfo() view external returns (uint256 balance, uint256 stakeDate)'
];

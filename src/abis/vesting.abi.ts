export const VestingABI = [
  'function getAddresses() public view returns(address[])',
  'function getToken() public view returns(IERC20)',
  'function createVesting(address destinationWallet, uint256 _totalLockedValue, uint256 _releaseValue, uint256 _releasePeriod, uint256 _cliffPeriod, uint256 _startTimestamp) public',
  'function getClaimableAmount(bytes32 vestingId) public view returns (uint256)',
  'function transferClaimableAmount(bytes32 vestingId) public',
  'function getVestingIds() public view returns(bytes32[])',
  'function getVesting(bytes32 vestingId) public view returns(Vesting)',
  'event VestingCreated(address from, bytes32 indexed vestingId, Vesting vesting)',
  'event AmountClaimed(address indexed sender, uint256 amount)',
];

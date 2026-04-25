export interface GraphNodeConfig {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface GraphNodeQueryError {
  message: string;
}

export interface GraphNodeQueryResponse<TData = unknown> {
  data?: TData;
  errors?: GraphNodeQueryError[];
}

export interface TenantCreated {
  id: string;
  tenantId: string;
  admin: string;
  manager: string;
  treasury: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface CoSignOperatorConfigured {
  id: string;
  tenantId: string;
  docType: string;
  operator: string;
  whitelisted: boolean;
  roleId: number;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface CoSignPolicyUpdated {
  id: string;
  tenantId: string;
  docType: string;
  enabled: boolean;
  minStake: string;
  minSigners: string;
  requiredRoleMask: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface DocumentAnchored {
  id: string;
  tenantId: string;
  fileHash: string;
  owner: string;
  cid: string;
  issuer: string;
  ciphertextHash: string;
  encryptionMetaHash: string;
  docType: string;
  version: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface DocumentCoSignQualified {
  id: string;
  tenantId: string;
  fileHash: string;
  trustedSigners: string;
  roleMask: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface DocumentCoSigned {
  id: string;
  tenantId: string;
  fileHash: string;
  signer: string;
  totalSigners: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface DocumentRevoked {
  id: string;
  tenantId: string;
  fileHash: string;
  revoker: string;
  reason: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface MinOperatorStakeUpdated {
  id: string;
  tenantId: string;
  oldValue: string;
  newValue: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface NonceConsumed {
  id: string;
  tenantId: string;
  signer: string;
  oldNonce: string;
  newNonce: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorJoined {
  id: string;
  tenantId: string;
  operator: string;
  metadata: string;
  stake: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorMetadataUpdated {
  id: string;
  tenantId: string;
  operator: string;
  metadataURI: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorRecovered {
  id: string;
  tenantId: string;
  oldOperator: string;
  newOperator: string;
  stakeAmount: string;
  reason: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorRecoveryAliasUpdated {
  id: string;
  tenantId: string;
  oldOperator: string;
  newOperator: string;
  rootOperator: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorRecoveryDelegateUpdated {
  id: string;
  tenantId: string;
  operator: string;
  delegate: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorSlashed {
  id: string;
  tenantId: string;
  operator: string;
  amount: string;
  slasher: string;
  reason: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorSoftSlashed {
  id: string;
  tenantId: string;
  operator: string;
  violationCode: string;
  penaltyBps: number;
  slashedAmount: string;
  remainingStake: string;
  slasher: string;
  reason: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorStakeToppedUp {
  id: string;
  tenantId: string;
  operator: string;
  amount: string;
  totalStake: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorStatusUpdated {
  id: string;
  tenantId: string;
  operator: string;
  isActive: boolean;
  reason: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorUnstakeRequested {
  id: string;
  tenantId: string;
  operator: string;
  availableAt: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OperatorUnstaked {
  id: string;
  tenantId: string;
  operator: string;
  amount: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface ProtocolInitialized {
  id: string;
  protocolOwner: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface RoleAdminChanged {
  id: string;
  role: string;
  previousAdminRole: string;
  newAdminRole: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface RoleGranted {
  id: string;
  role: string;
  account: string;
  sender: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface RoleRevoked {
  id: string;
  role: string;
  account: string;
  sender: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface TenantStatusUpdated {
  id: string;
  tenantId: string;
  isActive: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface TreasuryUpdated {
  id: string;
  tenantId: string;
  oldTreasury: string;
  newTreasury: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface UnstakeCooldownUpdated {
  id: string;
  tenantId: string;
  oldValue: string;
  newValue: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface ViolationPenaltyUpdated {
  id: string;
  tenantId: string;
  violationCode: string;
  oldPenaltyBps: number;
  newPenaltyBps: number;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

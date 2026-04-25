import type {
  CoSignOperatorConfigured,
  CoSignPolicyUpdated,
  DocumentAnchored,
  DocumentCoSignQualified,
  DocumentCoSigned,
  DocumentRevoked,
  GraphNodeConfig,
  GraphNodeQueryResponse,
  MinOperatorStakeUpdated,
  NonceConsumed,
  OperatorJoined,
  OperatorMetadataUpdated,
  OperatorRecovered,
  OperatorRecoveryAliasUpdated,
  OperatorRecoveryDelegateUpdated,
  OperatorSlashed,
  OperatorSoftSlashed,
  OperatorStakeToppedUp,
  OperatorStatusUpdated,
  OperatorUnstakeRequested,
  OperatorUnstaked,
  ProtocolInitialized,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  TenantCreated,
  TenantStatusUpdated,
  TreasuryUpdated,
  UnstakeCooldownUpdated,
  ViolationPenaltyUpdated,
} from "../types/graph.types";

type GraphQLVariables = Record<string, unknown>;

export class GraphQueryClient {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(config: GraphNodeConfig) {
    const endpoint = config.endpoint?.trim();
    if (!endpoint) {
      throw new Error("Thiếu endpoint graph-node");
    }

    this.endpoint = endpoint;
    this.headers = {
      "Content-Type": "application/json",
      ...(config.apiKey ? { "x-api-key": config.apiKey } : {}),
      ...(config.headers ?? {}),
    };
  }

  async query<TData = unknown>(
    query: string,
    variables: GraphQLVariables = {},
  ): Promise<TData> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Graph-node request lỗi (${response.status})`);
    }

    const json = (await response.json()) as GraphNodeQueryResponse<TData>;
    if (json.errors?.length) {
      throw new Error(json.errors.map((error) => error.message).join("; "));
    }

    if (!json.data) {
      throw new Error("Graph-node không trả về data");
    }

    return json.data;
  }

  private async queryOne<T>(
    methodName: string,
    entityName: string,
    fields: string[],
    id: string,
  ): Promise<T | null> {
    const fieldBlock = fields.join("\n          ");
    const gql = `
      query ${methodName}($targetId: ID!) {
        ${entityName}(id: $targetId) {
          ${fieldBlock}
        }
      }
    `;

    const data = await this.query<Record<string, T | null>>(gql, {
      targetId: id,
    });
    return data[entityName] ?? null;
  }

  private async queryMany<T>(
    methodName: string,
    collectionName: string,
    fields: string[],
    first?: number,
    where?: Record<string, unknown>,
  ): Promise<T[]> {
    const fieldBlock = fields.join("\n          ");

    const entityName =
      collectionName.charAt(0).toUpperCase() + collectionName.slice(1, -1);
    const filterType = `${entityName}_filter`;

    const variableDefinitions: string[] = [];
    const queryArgs: string[] = [];
    const variables: GraphQLVariables = {};

    if (typeof first === "number") {
      variableDefinitions.push("$limit: Int!");
      queryArgs.push("first: $limit");
      variables.limit = first;
    }

    if (where && Object.keys(where).length > 0) {
      variableDefinitions.push(`$where: ${filterType}`);
      queryArgs.push("where: $where");
      variables.where = where;
    }

    const variableBlock =
      variableDefinitions.length > 0
        ? `(${variableDefinitions.join(", ")})`
        : "";
    const argsBlock = queryArgs.length > 0 ? `(${queryArgs.join(", ")})` : "";

    const gql = `
    query ${methodName}${variableBlock} {
      ${collectionName}${argsBlock} {
        ${fieldBlock}
      }
    }
  `;

    const data = await this.query<Record<string, T[] | undefined>>(
      gql,
      variables,
    );

    return data[collectionName] ?? [];
  }

  async getCoSignOperatorConfigured(
    id: string,
  ): Promise<CoSignOperatorConfigured | null> {
    return this.queryOne<CoSignOperatorConfigured>(
      "getCoSignOperatorConfigured",
      "coSignOperatorConfigured",
      [
        "id",
        "tenantId",
        "docType",
        "operator",
        "whitelisted",
        "roleId",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getCoSignOperatorConfigureds(
    first: number,
  ): Promise<CoSignOperatorConfigured[]> {
    return this.queryMany<CoSignOperatorConfigured>(
      "getCoSignOperatorConfigureds",
      "coSignOperatorConfigureds",
      [
        "id",
        "tenantId",
        "docType",
        "operator",
        "whitelisted",
        "roleId",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getCoSignPolicyUpdated(
    id: string,
  ): Promise<CoSignPolicyUpdated | null> {
    return this.queryOne<CoSignPolicyUpdated>(
      "getCoSignPolicyUpdated",
      "coSignPolicyUpdated",
      [
        "id",
        "tenantId",
        "docType",
        "enabled",
        "minStake",
        "minSigners",
        "requiredRoleMask",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getCoSignPolicyUpdateds(
    first?: number,
  ): Promise<CoSignPolicyUpdated[]> {
    return this.queryMany<CoSignPolicyUpdated>(
      "getCoSignPolicyUpdateds",
      "coSignPolicyUpdateds",
      [
        "id",
        "tenantId",
        "docType",
        "enabled",
        "minStake",
        "minSigners",
        "requiredRoleMask",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getDocumentAnchored(id: string): Promise<DocumentAnchored | null> {
    return this.queryOne<DocumentAnchored>(
      "getDocumentAnchored",
      "documentAnchored",
      [
        "id",
        "tenantId",
        "fileHash",
        "owner",
        "cid",
        "issuer",
        "ciphertextHash",
        "encryptionMetaHash",
        "docType",
        "version",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getDocumentAnchoreds(first?: number): Promise<DocumentAnchored[]> {
    return this.queryMany<DocumentAnchored>(
      "getDocumentAnchoreds",
      "documentAnchoreds",
      [
        "id",
        "tenantId",
        "fileHash",
        "owner",
        "cid",
        "issuer",
        "ciphertextHash",
        "encryptionMetaHash",
        "docType",
        "version",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getDocumentCoSignQualified(
    id: string,
  ): Promise<DocumentCoSignQualified | null> {
    return this.queryOne<DocumentCoSignQualified>(
      "getDocumentCoSignQualified",
      "documentCoSignQualified",
      [
        "id",
        "tenantId",
        "fileHash",
        "trustedSigners",
        "roleMask",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getDocumentCoSignQualifieds(
    first?: number,
  ): Promise<DocumentCoSignQualified[]> {
    return this.queryMany<DocumentCoSignQualified>(
      "getDocumentCoSignQualifieds",
      "documentCoSignQualifieds",
      [
        "id",
        "tenantId",
        "fileHash",
        "trustedSigners",
        "roleMask",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getDocumentCoSigned(id: string): Promise<DocumentCoSigned | null> {
    return this.queryOne<DocumentCoSigned>(
      "getDocumentCoSigned",
      "documentCoSigned",
      [
        "id",
        "tenantId",
        "fileHash",
        "signer",
        "totalSigners",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getDocumentCoSigneds(first?: number): Promise<DocumentCoSigned[]> {
    return this.queryMany<DocumentCoSigned>(
      "getDocumentCoSigneds",
      "documentCoSigneds",
      [
        "id",
        "tenantId",
        "fileHash",
        "signer",
        "totalSigners",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getDocumentRevoked(id: string): Promise<DocumentRevoked | null> {
    return this.queryOne<DocumentRevoked>(
      "getDocumentRevoked",
      "documentRevoked",
      [
        "id",
        "tenantId",
        "fileHash",
        "revoker",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getDocumentRevokeds(first?: number): Promise<DocumentRevoked[]> {
    return this.queryMany<DocumentRevoked>(
      "getDocumentRevokeds",
      "documentRevokeds",
      [
        "id",
        "tenantId",
        "fileHash",
        "revoker",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getMinOperatorStakeUpdated(
    id: string,
  ): Promise<MinOperatorStakeUpdated | null> {
    return this.queryOne<MinOperatorStakeUpdated>(
      "getMinOperatorStakeUpdated",
      "minOperatorStakeUpdated",
      [
        "id",
        "tenantId",
        "oldValue",
        "newValue",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getMinOperatorStakeUpdateds(
    first?: number,
  ): Promise<MinOperatorStakeUpdated[]> {
    return this.queryMany<MinOperatorStakeUpdated>(
      "getMinOperatorStakeUpdateds",
      "minOperatorStakeUpdateds",
      [
        "id",
        "tenantId",
        "oldValue",
        "newValue",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getNonceConsumed(id: string): Promise<NonceConsumed | null> {
    return this.queryOne<NonceConsumed>(
      "getNonceConsumed",
      "nonceConsumed",
      [
        "id",
        "tenantId",
        "signer",
        "oldNonce",
        "newNonce",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getNonceConsumeds(first?: number): Promise<NonceConsumed[]> {
    return this.queryMany<NonceConsumed>(
      "getNonceConsumeds",
      "nonceConsumeds",
      [
        "id",
        "tenantId",
        "signer",
        "oldNonce",
        "newNonce",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorJoined(id: string): Promise<OperatorJoined | null> {
    return this.queryOne<OperatorJoined>(
      "getOperatorJoined",
      "operatorJoined",
      [
        "id",
        "tenantId",
        "operator",
        "metadata",
        "stake",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorJoineds(first?: number): Promise<OperatorJoined[]> {
    return this.queryMany<OperatorJoined>(
      "getOperatorJoineds",
      "operatorJoineds",
      [
        "id",
        "tenantId",
        "operator",
        "metadata",
        "stake",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorByUsers(address: string): Promise<OperatorJoined[]> {
    return this.queryMany<OperatorJoined>(
      "getOperatorByUsers",
      "operatorJoineds",
      ["id", "tenantId", "operator"],
      10,
      {
        or: [{ operator: address }],
      },
    );
  }

  async getOperatorMetadataUpdated(
    id: string,
  ): Promise<OperatorMetadataUpdated | null> {
    return this.queryOne<OperatorMetadataUpdated>(
      "getOperatorMetadataUpdated",
      "operatorMetadataUpdated",
      [
        "id",
        "tenantId",
        "operator",
        "metadataURI",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorMetadataUpdateds(
    first?: number,
  ): Promise<OperatorMetadataUpdated[]> {
    return this.queryMany<OperatorMetadataUpdated>(
      "getOperatorMetadataUpdateds",
      "operatorMetadataUpdateds",
      [
        "id",
        "tenantId",
        "operator",
        "metadataURI",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorRecovered(id: string): Promise<OperatorRecovered | null> {
    return this.queryOne<OperatorRecovered>(
      "getOperatorRecovered",
      "operatorRecovered",
      [
        "id",
        "tenantId",
        "oldOperator",
        "newOperator",
        "stakeAmount",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorRecovereds(first?: number): Promise<OperatorRecovered[]> {
    return this.queryMany<OperatorRecovered>(
      "getOperatorRecovereds",
      "operatorRecovereds",
      [
        "id",
        "tenantId",
        "oldOperator",
        "newOperator",
        "stakeAmount",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorRecoveryAliasUpdated(
    id: string,
  ): Promise<OperatorRecoveryAliasUpdated | null> {
    return this.queryOne<OperatorRecoveryAliasUpdated>(
      "getOperatorRecoveryAliasUpdated",
      "operatorRecoveryAliasUpdated",
      [
        "id",
        "tenantId",
        "oldOperator",
        "newOperator",
        "rootOperator",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorRecoveryAliasUpdateds(
    first?: number,
  ): Promise<OperatorRecoveryAliasUpdated[]> {
    return this.queryMany<OperatorRecoveryAliasUpdated>(
      "getOperatorRecoveryAliasUpdateds",
      "operatorRecoveryAliasUpdateds",
      [
        "id",
        "tenantId",
        "oldOperator",
        "newOperator",
        "rootOperator",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorRecoveryDelegateUpdated(
    id: string,
  ): Promise<OperatorRecoveryDelegateUpdated | null> {
    return this.queryOne<OperatorRecoveryDelegateUpdated>(
      "getOperatorRecoveryDelegateUpdated",
      "operatorRecoveryDelegateUpdated",
      [
        "id",
        "tenantId",
        "operator",
        "delegate",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorRecoveryDelegateUpdateds(
    first?: number,
  ): Promise<OperatorRecoveryDelegateUpdated[]> {
    return this.queryMany<OperatorRecoveryDelegateUpdated>(
      "getOperatorRecoveryDelegateUpdateds",
      "operatorRecoveryDelegateUpdateds",
      [
        "id",
        "tenantId",
        "operator",
        "delegate",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorSlashed(id: string): Promise<OperatorSlashed | null> {
    return this.queryOne<OperatorSlashed>(
      "getOperatorSlashed",
      "operatorSlashed",
      [
        "id",
        "tenantId",
        "operator",
        "amount",
        "slasher",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorSlasheds(first?: number): Promise<OperatorSlashed[]> {
    return this.queryMany<OperatorSlashed>(
      "getOperatorSlasheds",
      "operatorSlasheds",
      [
        "id",
        "tenantId",
        "operator",
        "amount",
        "slasher",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorSoftSlashed(
    id: string,
  ): Promise<OperatorSoftSlashed | null> {
    return this.queryOne<OperatorSoftSlashed>(
      "getOperatorSoftSlashed",
      "operatorSoftSlashed",
      [
        "id",
        "tenantId",
        "operator",
        "violationCode",
        "penaltyBps",
        "slashedAmount",
        "remainingStake",
        "slasher",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorSoftSlasheds(
    first?: number,
  ): Promise<OperatorSoftSlashed[]> {
    return this.queryMany<OperatorSoftSlashed>(
      "getOperatorSoftSlasheds",
      "operatorSoftSlasheds",
      [
        "id",
        "tenantId",
        "operator",
        "violationCode",
        "penaltyBps",
        "slashedAmount",
        "remainingStake",
        "slasher",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorStakeToppedUp(
    id: string,
  ): Promise<OperatorStakeToppedUp | null> {
    return this.queryOne<OperatorStakeToppedUp>(
      "getOperatorStakeToppedUp",
      "operatorStakeToppedUp",
      [
        "id",
        "tenantId",
        "operator",
        "amount",
        "totalStake",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorStakeToppedUps(
    first?: number,
  ): Promise<OperatorStakeToppedUp[]> {
    return this.queryMany<OperatorStakeToppedUp>(
      "getOperatorStakeToppedUps",
      "operatorStakeToppedUps",
      [
        "id",
        "tenantId",
        "operator",
        "amount",
        "totalStake",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorStatusUpdated(
    id: string,
  ): Promise<OperatorStatusUpdated | null> {
    return this.queryOne<OperatorStatusUpdated>(
      "getOperatorStatusUpdated",
      "operatorStatusUpdated",
      [
        "id",
        "tenantId",
        "operator",
        "isActive",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorStatusUpdateds(
    first?: number,
  ): Promise<OperatorStatusUpdated[]> {
    return this.queryMany<OperatorStatusUpdated>(
      "getOperatorStatusUpdateds",
      "operatorStatusUpdateds",
      [
        "id",
        "tenantId",
        "operator",
        "isActive",
        "reason",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorUnstakeRequested(
    id: string,
  ): Promise<OperatorUnstakeRequested | null> {
    return this.queryOne<OperatorUnstakeRequested>(
      "getOperatorUnstakeRequested",
      "operatorUnstakeRequested",
      [
        "id",
        "tenantId",
        "operator",
        "availableAt",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorUnstakeRequesteds(
    first?: number,
  ): Promise<OperatorUnstakeRequested[]> {
    return this.queryMany<OperatorUnstakeRequested>(
      "getOperatorUnstakeRequesteds",
      "operatorUnstakeRequesteds",
      [
        "id",
        "tenantId",
        "operator",
        "availableAt",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getOperatorUnstaked(id: string): Promise<OperatorUnstaked | null> {
    return this.queryOne<OperatorUnstaked>(
      "getOperatorUnstaked",
      "operatorUnstaked",
      [
        "id",
        "tenantId",
        "operator",
        "amount",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getOperatorUnstakeds(first?: number): Promise<OperatorUnstaked[]> {
    return this.queryMany<OperatorUnstaked>(
      "getOperatorUnstakeds",
      "operatorUnstakeds",
      [
        "id",
        "tenantId",
        "operator",
        "amount",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getProtocolInitialized(
    id: string,
  ): Promise<ProtocolInitialized | null> {
    return this.queryOne<ProtocolInitialized>(
      "getProtocolInitialized",
      "protocolInitialized",
      [
        "id",
        "protocolOwner",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getProtocolInitializeds(
    first?: number,
  ): Promise<ProtocolInitialized[]> {
    return this.queryMany<ProtocolInitialized>(
      "getProtocolInitializeds",
      "protocolInitializeds",
      [
        "id",
        "protocolOwner",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getRoleAdminChanged(id: string): Promise<RoleAdminChanged | null> {
    return this.queryOne<RoleAdminChanged>(
      "getRoleAdminChanged",
      "roleAdminChanged",
      [
        "id",
        "role",
        "previousAdminRole",
        "newAdminRole",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getRoleAdminChangeds(first?: number): Promise<RoleAdminChanged[]> {
    return this.queryMany<RoleAdminChanged>(
      "getRoleAdminChangeds",
      "roleAdminChangeds",
      [
        "id",
        "role",
        "previousAdminRole",
        "newAdminRole",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getRoleGranted(id: string): Promise<RoleGranted | null> {
    return this.queryOne<RoleGranted>(
      "getRoleGranted",
      "roleGranted",
      [
        "id",
        "role",
        "account",
        "sender",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getRoleGranteds(first?: number): Promise<RoleGranted[]> {
    return this.queryMany<RoleGranted>(
      "getRoleGranteds",
      "roleGranteds",
      [
        "id",
        "role",
        "account",
        "sender",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getRoleRevoked(id: string): Promise<RoleRevoked | null> {
    return this.queryOne<RoleRevoked>(
      "getRoleRevoked",
      "roleRevoked",
      [
        "id",
        "role",
        "account",
        "sender",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getRoleRevokeds(first?: number): Promise<RoleRevoked[]> {
    return this.queryMany<RoleRevoked>(
      "getRoleRevokeds",
      "roleRevokeds",
      [
        "id",
        "role",
        "account",
        "sender",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getTenantCreated(id: string): Promise<TenantCreated | null> {
    return this.queryOne<TenantCreated>(
      "getTenantCreated",
      "tenantCreated",
      [
        "id",
        "tenantId",
        "admin",
        "manager",
        "treasury",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getTenantCreateds(first?: number): Promise<TenantCreated[]> {
    return this.queryMany<TenantCreated>(
      "getTenantCreateds",
      "tenantCreateds",
      [
        "id",
        "tenantId",
        "admin",
        "manager",
        "treasury",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getTenantsByUsers(userAddress: string): Promise<TenantCreated[]> {
    return this.queryMany<TenantCreated>(
      "getTenantsByUsers",
      "tenantCreateds",
      ["id", "tenantId", "admin", "manager", "treasury"],
      1,
      {
        or: [
          { admin: userAddress },
          { manager: userAddress },
          { treasury: userAddress },
        ],
      },
    );
  }

  async getTenantStatusUpdated(
    id: string,
  ): Promise<TenantStatusUpdated | null> {
    return this.queryOne<TenantStatusUpdated>(
      "getTenantStatusUpdated",
      "tenantStatusUpdated",
      [
        "id",
        "tenantId",
        "isActive",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getTenantStatusUpdateds(
    first?: number,
  ): Promise<TenantStatusUpdated[]> {
    return this.queryMany<TenantStatusUpdated>(
      "getTenantStatusUpdateds",
      "tenantStatusUpdateds",
      [
        "id",
        "tenantId",
        "isActive",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getTreasuryUpdated(id: string): Promise<TreasuryUpdated | null> {
    return this.queryOne<TreasuryUpdated>(
      "getTreasuryUpdated",
      "treasuryUpdated",
      [
        "id",
        "tenantId",
        "oldTreasury",
        "newTreasury",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getTreasuryUpdateds(first?: number): Promise<TreasuryUpdated[]> {
    return this.queryMany<TreasuryUpdated>(
      "getTreasuryUpdateds",
      "treasuryUpdateds",
      [
        "id",
        "tenantId",
        "oldTreasury",
        "newTreasury",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getUnstakeCooldownUpdated(
    id: string,
  ): Promise<UnstakeCooldownUpdated | null> {
    return this.queryOne<UnstakeCooldownUpdated>(
      "getUnstakeCooldownUpdated",
      "unstakeCooldownUpdated",
      [
        "id",
        "tenantId",
        "oldValue",
        "newValue",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getUnstakeCooldownUpdateds(
    first: number,
  ): Promise<UnstakeCooldownUpdated[]> {
    return this.queryMany<UnstakeCooldownUpdated>(
      "getUnstakeCooldownUpdateds",
      "unstakeCooldownUpdateds",
      [
        "id",
        "tenantId",
        "oldValue",
        "newValue",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }

  async getViolationPenaltyUpdated(
    id: string,
  ): Promise<ViolationPenaltyUpdated | null> {
    return this.queryOne<ViolationPenaltyUpdated>(
      "getViolationPenaltyUpdated",
      "violationPenaltyUpdated",
      [
        "id",
        "tenantId",
        "violationCode",
        "oldPenaltyBps",
        "newPenaltyBps",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      id,
    );
  }

  async getViolationPenaltyUpdateds(
    first?: number,
  ): Promise<ViolationPenaltyUpdated[]> {
    return this.queryMany<ViolationPenaltyUpdated>(
      "getViolationPenaltyUpdateds",
      "violationPenaltyUpdateds",
      [
        "id",
        "tenantId",
        "violationCode",
        "oldPenaltyBps",
        "newPenaltyBps",
        "blockNumber",
        "blockTimestamp",
        "transactionHash",
      ],
      first,
    );
  }
}

export function createGraphQueryClient(
  config: GraphNodeConfig,
): GraphQueryClient {
  return new GraphQueryClient(config);
}

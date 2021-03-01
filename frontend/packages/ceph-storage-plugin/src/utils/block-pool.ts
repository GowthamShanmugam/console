import { apiVersionForModel } from '@console/internal/module/k8s';

import { StoragePoolKind } from '../types';
import { CephBlockPoolModel } from '../models';
import { CEPH_STORAGE_NAMESPACE } from '../constants/index';
import { COMPRESSION_ON, ROOK_MODEL } from '../constants/storage-pool-const';

export type BlockPoolState = {
  poolName: string;
  poolStatus: string;
  replicaSize: string;
  isCompressed: boolean;
  isArbiterCluster: boolean;
  volumeType: string;
  isSubmitted: boolean;
  inprogress: boolean;
  errorMessage: string;
};

export enum BlockPoolActionType {
  SET_POOL_NAME = 'SET_POOL_NAME',
  SET_POOL_STATUS = 'SET_POOL_STATUS',
  SET_POOL_REPLICA_SIZE = 'SET_POOL_REPLICA_SIZE',
  SET_POOL_COMPRESSED = 'SET_POOL_COMPRESSED',
  SET_POOL_ARBITER = 'SET_POOL_ARBITER',
  SET_POOL_VOLUME_TYPE = 'SET_POOL_VOLUME_TYPE',
  SET_IS_SUBMITTED = 'SET_IS_SUBMITTED',
  SET_INPROGRESS = 'SET_INPROGRESS',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
}

export type BlockPoolAction =
  | { type: BlockPoolActionType.SET_POOL_NAME; payload: string }
  | { type: BlockPoolActionType.SET_POOL_STATUS; payload: string }
  | { type: BlockPoolActionType.SET_POOL_REPLICA_SIZE; payload: string }
  | { type: BlockPoolActionType.SET_POOL_COMPRESSED; payload: boolean }
  | { type: BlockPoolActionType.SET_POOL_ARBITER; payload: boolean }
  | { type: BlockPoolActionType.SET_POOL_VOLUME_TYPE; payload: string }
  | { type: BlockPoolActionType.SET_IS_SUBMITTED; payload: boolean }
  | { type: BlockPoolActionType.SET_INPROGRESS; payload: boolean }
  | { type: BlockPoolActionType.SET_ERROR_MESSAGE; payload: string };

export const blockPoolInitialState: BlockPoolState = {
  poolName: 'sc-pool',
  poolStatus: '',
  replicaSize: '',
  isCompressed: false,
  isArbiterCluster: false,
  volumeType: '',
  isSubmitted: false,
  inprogress: false,
  errorMessage: '',
};

export const blockPoolReducer = (state: BlockPoolState, action: BlockPoolAction) => {
  switch (action.type) {
    case BlockPoolActionType.SET_POOL_NAME: {
      return {
        ...state,
        poolName: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_STATUS: {
      return {
        ...state,
        poolStatus: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_REPLICA_SIZE: {
      return {
        ...state,
        replicaSize: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_COMPRESSED: {
      return {
        ...state,
        isCompressed: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_ARBITER: {
      return {
        ...state,
        isArbiterCluster: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_VOLUME_TYPE: {
      return {
        ...state,
        volumeType: action.payload,
      };
    }
    case BlockPoolActionType.SET_IS_SUBMITTED: {
      return {
        ...state,
        isSubmitted: action.payload,
      };
    }
    case BlockPoolActionType.SET_INPROGRESS: {
      return {
        ...state,
        inprogress: action.payload,
      };
    }
    case BlockPoolActionType.SET_ERROR_MESSAGE: {
      return {
        ...state,
        errorMessage: action.payload,
      };
    }
    default:
      return state;
  }
};

export const getErrorMessage = (error: string): string => error.replace(ROOK_MODEL, 'Pool');

export const getPoolKindObj = (state: BlockPoolState): StoragePoolKind => ({
  apiVersion: apiVersionForModel(CephBlockPoolModel),
  kind: CephBlockPoolModel.kind,
  metadata: {
    name: state.poolName,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  spec: {
    compressionMode: state.isCompressed ? COMPRESSION_ON : '',
    deviceClass: state.volumeType || '',
    parameters: {
      compression_mode: state.isCompressed ? COMPRESSION_ON : '', // eslint-disable-line @typescript-eslint/camelcase
    },
    replicated: {
      size: Number(state.replicaSize),
    },
  },
});

export const checkRequiredValues = (state: BlockPoolState): boolean =>
  !state.poolName || !state.replicaSize;

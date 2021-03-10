import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { useDeepCompareMemoize } from '@console/shared';
import { ActionGroup, Button } from '@patternfly/react-core';
import {
  createModalLauncher,
  ModalTitle,
  ModalBody,
  ModalComponentProps,
  ModalFooter,
} from '@console/internal/components/factory/modal';
import { LoadingInline } from '@console/internal/components/utils';
import { k8sPatch } from '@console/internal/module/k8s';

import { PoolBodyComponent, PoolStatusComponent } from '../../block-pool/block-pool-form';
import { CephClusterKind } from '../../../types';
import { cephClusterResource } from '../../../constants/resources';
import {
  blockPoolReducer,
  blockPoolInitialState,
  BlockPoolState,
  BlockPoolAction,
  BlockPoolActionType,
  checkRequiredValues,
  getErrorMessage,
} from '../../../utils/block-pool';
import {
  POOL_PROGRESS,
  POOL_STATE,
  COMPRESSION_ON,
  CEPH_DEFAULT_BLOCK_POOL_NAME,
} from '../../../constants/storage-pool-const';
import { CephBlockPoolModel } from '../../../models';
import { CEPH_EXTERNAL_CR_NAME } from '../../../constants';

import './block-pool-update-modal.scss';

export const StoragePoolUpdateModalFooter = (props: StoragePoolUpdateModalFooterProps) => {
  const { state, dispatch, cancel } = props;

  const { t } = useTranslation();
  const submitPoolUpdate = (e: React.FormEvent<EventTarget>) => {
    e.preventDefault();
    if (state.poolStatus === '') {
      dispatch({ type: BlockPoolActionType.SET_IS_SUBMITTED, payload: true });
    }
  };

  return (
    <ActionGroup className="pf-c-form pf-c-form__actions--left pf-c-form__group--no-top-margin">
      <Button
        type="button"
        variant="primary"
        data-test-id="modal-update-action"
        onClick={submitPoolUpdate}
        isDisabled={checkRequiredValues(state)}
      >
        {t('ceph-storage-plugin~Save')}
      </Button>
      <Button type="button" variant="secondary" data-test-id="modal-cancel-action" onClick={cancel}>
        {t('ceph-storage-plugin~Cancel')}
      </Button>
    </ActionGroup>
  );
};

const BlockPoolUpdateModal = (props: BlockPoolUpdateModalProps) => {
  const { t } = useTranslation();
  const { blockPoolConfig, cancel, close } = props;

  const MODAL_DESC = t(
    'ceph-storage-plugin~Pools are logical groups of Ceph objects. Such objects live inside of Ceph, or rather they live inside RADOS.',
  );
  const MODAL_TITLE = t('ceph-storage-plugin~Edit Pool');

  const [cephClusterObj, isLoaded, loadError] = useK8sWatchResource<CephClusterKind[]>(
    cephClusterResource,
  );
  const cephClusterCSV: CephClusterKind[] = useDeepCompareMemoize(cephClusterObj, true);

  const [state, dispatch] = React.useReducer(blockPoolReducer, blockPoolInitialState);

  React.useEffect(() => {
    // restrict pool management for default pool and external cluster
    if (
      cephClusterObj[0]?.metadata.name === CEPH_EXTERNAL_CR_NAME ||
      blockPoolConfig?.metadata.name === CEPH_DEFAULT_BLOCK_POOL_NAME
    ) {
      dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: POOL_PROGRESS.NOTALLOWED });
    } else if (cephClusterObj[0]?.status?.phase === POOL_STATE.READY) {
      dispatch({
        type: BlockPoolActionType.SET_POOL_NAME,
        payload: blockPoolConfig?.metadata.name,
      });
      dispatch({
        type: BlockPoolActionType.SET_POOL_REPLICA_SIZE,
        payload: blockPoolConfig?.spec.replicated.size,
      });
      dispatch({
        type: BlockPoolActionType.SET_POOL_COMPRESSED,
        payload: blockPoolConfig?.spec.compressionMode === COMPRESSION_ON,
      });
      dispatch({
        type: BlockPoolActionType.SET_POOL_VOLUME_TYPE,
        payload: blockPoolConfig?.spec.deviceClass,
      });
      dispatch({ type: BlockPoolActionType.SET_IS_POOL_EDIT, payload: true });
    }
  }, [blockPoolConfig, cephClusterObj]);

  // Update pool
  React.useEffect(() => {
    if (state.isSubmitted) {
      dispatch({ type: BlockPoolActionType.SET_IS_SUBMITTED, payload: false });
      const patch = [
        {
          op: 'replace',
          path: '/spec/deviceClass',
          value: state.volumeType || '',
        },
        {
          op: 'replace',
          path: '/spec/replicated/size',
          value: Number(state.replicaSize),
        },
        {
          op: 'replace',
          path: '/spec/compressionMode',
          value: state.isCompressed ? COMPRESSION_ON : '',
        },
        {
          op: 'replace',
          path: '/spec/parameters/compression_mode',
          value: state.isCompressed ? COMPRESSION_ON : '',
        },
      ];

      dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: true });
      k8sPatch(CephBlockPoolModel, blockPoolConfig, patch)
        .then(() => {
          dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: false });
          close();
        })
        .catch((err) => {
          dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: false });
          dispatch({
            type: BlockPoolActionType.SET_ERROR_MESSAGE,
            payload: getErrorMessage(err.message) || 'Could not update block pool.',
          });
        });
    }
  }, [blockPoolConfig, close, state, state.isSubmitted]);

  return (
    <div className="modal-content modal-content--no-inner-scroll block_pool_update_modal__footer">
      <ModalTitle>{MODAL_TITLE}</ModalTitle>
      <ModalBody>
        <p>{MODAL_DESC}</p>
        {isLoaded && !loadError ? (
          state.poolStatus ? (
            <div key="progress-modal">
              <PoolStatusComponent status={state.poolStatus} />
            </div>
          ) : (
            <PoolBodyComponent cephClusterObj={cephClusterCSV} state={state} dispatch={dispatch} />
          )
        ) : (
          <LoadingInline />
        )}
      </ModalBody>
      <ModalFooter inProgress={state.inprogress}>
        <StoragePoolUpdateModalFooter state={state} dispatch={dispatch} cancel={cancel} />
      </ModalFooter>
    </div>
  );
};

type StoragePoolUpdateModalFooterProps = {
  state: BlockPoolState;
  dispatch: React.Dispatch<BlockPoolAction>;
} & ModalComponentProps;

type BlockPoolUpdateModalProps = {
  kind?: any;
  blockPoolConfig?: any;
} & ModalComponentProps;

export const blockPoolUpdateModal = createModalLauncher(BlockPoolUpdateModal);

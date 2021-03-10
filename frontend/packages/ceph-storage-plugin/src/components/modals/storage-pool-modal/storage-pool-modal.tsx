import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActionGroup, Button } from '@patternfly/react-core';

import {
  createModalLauncher,
  ModalTitle,
  ModalBody,
  ModalComponentProps,
  ModalFooter,
} from '@console/internal/components/factory/modal';
import {
  HandlePromiseProps,
  withHandlePromise,
} from '@console/internal/components/utils/promise-component';
import { k8sCreate } from '@console/internal/module/k8s/resource';
import { referenceForModel } from '@console/internal/module/k8s';
import {
  useK8sWatchResource,
  WatchK8sResource,
} from '@console/internal/components/utils/k8s-watch-hook';

import { CephClusterKind, StoragePoolKind } from '../../../types';
import { CephBlockPoolModel } from '../../../models';
import { CEPH_STORAGE_NAMESPACE } from '../../../constants/index';
import { SECOND } from '../../../../integration-tests/utils/consts';
import { POOL_STATE, POOL_PROGRESS } from '../../../constants/storage-pool-const';
import {
  blockPoolReducer,
  blockPoolInitialState,
  BlockPoolState,
  BlockPoolAction,
  BlockPoolActionType,
  getPoolKindObj,
  checkRequiredValues,
} from '../../../utils/block-pool';
import { PoolBodyComponent, PoolStatusComponent } from '../../block-pool/block-pool-form';

import './storage-pool-modal.scss';

export const StoragePoolModal = withHandlePromise((props: StoragePoolModalProps) => {
  const { cephClusterObj, handlePromise, errorMessage } = props;

  const { t } = useTranslation();

  const [state, dispatch] = React.useReducer(blockPoolReducer, blockPoolInitialState);
  const [isSubmit, setIsSubmit] = React.useState(false);
  const [timer, setTimer] = React.useState<NodeJS.Timer>(null);

  const MODAL_DESC = t(
    'ceph-storage-plugin~A Storage pool is a logical entity providing elastic capacity to applications and workloads. Pools provide a means of supporting policies for access data resilience and storage efficiency.',
  );
  const MODAL_TITLE = t('ceph-storage-plugin~Create New Storage Pool');

  // Watch newly created pool after submit
  const poolResource: WatchK8sResource = React.useMemo(() => {
    return {
      kind: referenceForModel(CephBlockPoolModel),
      namespaced: true,
      isList: false,
      name: state.poolName,
      namespace: CEPH_STORAGE_NAMESPACE,
    };
  }, [state.poolName]);

  const [newPool, newPoolLoaded, newPoolLoadError] = useK8sWatchResource<StoragePoolKind>(
    poolResource,
  );

  React.useEffect(() => {
    if (isSubmit) {
      if (newPool && newPoolLoaded && newPool?.status?.phase === POOL_STATE.READY) {
        dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: POOL_PROGRESS.CREATED });
        setIsSubmit(false);
        clearTimeout(timer);
      } else if (newPoolLoaded && newPool?.status?.phase === POOL_STATE.FAILED) {
        dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: POOL_PROGRESS.FAILED });
        setIsSubmit(false);
        clearTimeout(timer);
      } else if (newPoolLoaded && newPoolLoadError && newPoolLoadError?.response?.status !== 404) {
        dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: POOL_PROGRESS.FAILED });
        setIsSubmit(false);
        clearTimeout(timer);
      }
    }
  }, [isSubmit, newPool, newPoolLoadError, newPoolLoaded, timer]);

  // Create new pool
  React.useEffect(() => {
    if (state.isSubmitted) {
      dispatch({ type: BlockPoolActionType.SET_IS_SUBMITTED, payload: false });
      dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: POOL_PROGRESS.PROGRESS });
      const poolObj: StoragePoolKind = getPoolKindObj(state);

      handlePromise(
        k8sCreate(CephBlockPoolModel, poolObj),
        () => {
          setIsSubmit(true);
          // The modal will wait for 15 sec to get feedback from Rook
          const timeoutTimer = setTimeout(() => {
            dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: POOL_PROGRESS.TIMEOUT });
            setIsSubmit(false);
          }, 30 * SECOND);
          setTimer(timeoutTimer);
        },
        () => {
          dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: POOL_PROGRESS.FAILED });
        },
      );
    }
  }, [handlePromise, state, state.isSubmitted]);

  return (
    <div className="modal-content modal-content--no-inner-scroll">
      <ModalTitle>{MODAL_TITLE}</ModalTitle>
      <ModalBody>
        <p>{MODAL_DESC}</p>
        {state.poolStatus ? (
          <div key="progress-modal">
            <PoolStatusComponent
              status={state.poolStatus}
              name={state.poolName}
              error={errorMessage}
            />
          </div>
        ) : (
          <PoolBodyComponent cephClusterObj={cephClusterObj} state={state} dispatch={dispatch} />
        )}
      </ModalBody>
      <ModalFooter inProgress={state.poolStatus === POOL_PROGRESS.PROGRESS}>
        <StoragePoolModalFooter
          state={state}
          dispatch={dispatch}
          onPoolCreation={props.onPoolCreation}
          cancel={props.cancel}
          close={props.close}
        />
      </ModalFooter>
    </div>
  );
});

export const StoragePoolModalFooter = (props: StoragePoolFooterComponentProps) => {
  const { state, dispatch, onPoolCreation, cancel, close } = props;
  const { t } = useTranslation();

  const handleTryAgainButton = (e: React.FormEvent<EventTarget>) => {
    e.preventDefault();
    dispatch({ type: BlockPoolActionType.SET_POOL_STATUS, payload: '' });
  };

  const handleFinishButton = (e: React.FormEvent<EventTarget>) => {
    e.preventDefault();
    if (state.poolStatus === POOL_PROGRESS.CREATED) {
      onPoolCreation(state.poolName);
    }
    close();
  };

  const submitPoolCreation = (e: React.FormEvent<EventTarget>) => {
    e.preventDefault();
    if (state.poolStatus === '') {
      dispatch({ type: BlockPoolActionType.SET_IS_SUBMITTED, payload: true });
    }
  };

  if (state.poolStatus) {
    return (
      <ActionGroup className="pf-c-form pf-c-form__actions--right pf-c-form__group--no-top-margin">
        {state.poolStatus === POOL_PROGRESS.FAILED && (
          <Button
            type="button"
            variant="secondary"
            data-test="modal-try-again-action"
            onClick={handleTryAgainButton}
          >
            {t('ceph-storage-plugin~Try Again')}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          data-test="confirm-action"
          isDisabled={state.poolStatus === POOL_PROGRESS.PROGRESS}
          id="confirm-action"
          onClick={handleFinishButton}
        >
          {t('ceph-storage-plugin~Finish')}
        </Button>
      </ActionGroup>
    );
  }
  return (
    <ActionGroup className="pf-c-form pf-c-form__actions--right pf-c-form__group--no-top-margin">
      <Button type="button" variant="secondary" data-test-id="modal-cancel-action" onClick={cancel}>
        {t('ceph-storage-plugin~Cancel')}
      </Button>
      <Button
        type="button"
        variant="primary"
        data-test="modal-create-action"
        onClick={submitPoolCreation}
        isDisabled={checkRequiredValues(state)}
      >
        {t('ceph-storage-plugin~Create')}
      </Button>
    </ActionGroup>
  );
};

export type StoragePoolModalProps = {
  cephClusterObj?: CephClusterKind[];
  onPoolCreation: (name: string) => void;
} & ModalComponentProps &
  HandlePromiseProps;

type StoragePoolFooterComponentProps = {
  state: BlockPoolState;
  dispatch: React.Dispatch<BlockPoolAction>;
  onPoolCreation: (name: string) => void;
} & ModalComponentProps;

export const storagePoolModal = createModalLauncher(StoragePoolModal);

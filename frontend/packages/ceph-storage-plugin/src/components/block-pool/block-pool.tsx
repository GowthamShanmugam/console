import * as React from 'react';
import { match as RouteMatch } from 'react-router';
import { useTranslation } from 'react-i18next';

import { referenceForModel, K8sResourceKind } from '@console/internal/module/k8s';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { useDeepCompareMemoize } from '@console/shared';
import {
  BreadCrumbs,
  LoadingInline,
  history,
  resourcePathFromModel,
  ButtonBar,
} from '@console/internal/components/utils';
import {
  ClusterServiceVersionModel,
  ClusterServiceVersionKind,
} from '@console/operator-lifecycle-manager';
import { ActionGroup, Button } from '@patternfly/react-core';
import { k8sCreate } from '@console/internal/module/k8s/resource';
import { Modal } from '@console/shared/src/components/modal';

import { PoolBodyComponent } from './block-pool-form';
import { CephClusterKind, StoragePoolKind } from '../../types';
import { cephClusterResource } from '../../constants/resources';
import { CEPH_EXTERNAL_CR_NAME } from '../../constants';
import { CephBlockPoolModel } from '../../models';
import {
  blockPoolReducer,
  blockPoolInitialState,
  BlockPoolState,
  BlockPoolAction,
  BlockPoolActionType,
  getPoolKindObj,
  getErrorMessage,
  checkRequiredValues,
} from '../../utils/block-pool';

import './block-pool.scss';

export const BlockPoolCreationPageFooter = (props: BlockPoolCreationPageFooterProps) => {
  const { state, dispatch, cancel } = props;
  const { t } = useTranslation();

  const submitPoolCreation = () => {
    if (state.poolStatus === '') {
      dispatch({ type: BlockPoolActionType.SET_IS_SUBMITTED, payload: true });
    }
  };

  return (
    <ButtonBar errorMessage={state.errorMessage} inProgress={state.inprogress}>
      <ActionGroup className="pf-c-form pf-c-form__actions--left">
        <Button
          type="button"
          variant="primary"
          data-test-id="modal-create-action"
          onClick={submitPoolCreation}
          isDisabled={checkRequiredValues(state)}
        >
          {t('ceph-storage-plugin~Create')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-test-id="modal-cancel-action"
          onClick={cancel}
        >
          {t('ceph-storage-plugin~Cancel')}
        </Button>
      </ActionGroup>
    </ButtonBar>
  );
};

const BlockPoolCreationPage: React.FC<BlockPoolCreationPageProps> = ({ match }) => {
  const {
    params: { ns, appName },
    url,
  } = match;
  const { t } = useTranslation();

  const csvResource = {
    kind: referenceForModel(ClusterServiceVersionModel),
    name: appName,
    namespace: ns,
    isList: false,
  };
  const [csv] = useK8sWatchResource<ClusterServiceVersionKind>(csvResource);
  const memoizedCSV: K8sResourceKind = useDeepCompareMemoize(csv, true);

  const [cephClusterObj, isLoaded, loadError] = useK8sWatchResource<CephClusterKind[]>(
    cephClusterResource,
  );
  const cephClusterCSV: CephClusterKind[] = useDeepCompareMemoize(cephClusterObj, true);

  const [state, dispatch] = React.useReducer(blockPoolReducer, blockPoolInitialState);

  const storageClusterListPage = `${resourcePathFromModel(
    ClusterServiceVersionModel,
    appName,
    ns,
  )}/${referenceForModel(CephBlockPoolModel)}`;

  const onClose = () => {
    history.push(storageClusterListPage);
  };

  // Create new pool
  React.useEffect(() => {
    if (state.isSubmitted) {
      dispatch({ type: BlockPoolActionType.SET_IS_SUBMITTED, payload: false });
      const poolObj: StoragePoolKind = getPoolKindObj(state);

      dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: true });
      k8sCreate(CephBlockPoolModel, poolObj)
        .then(() => {
          dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: false });
          history.push(`${storageClusterListPage}/${state.poolName}`);
        })
        .catch((err) => {
          dispatch({
            type: BlockPoolActionType.SET_ERROR_MESSAGE,
            payload: getErrorMessage(err.message) || 'Could not create block pool.',
          });
          dispatch({ type: BlockPoolActionType.SET_INPROGRESS, payload: false });
        });
    }
  }, [state, state.isSubmitted, storageClusterListPage]);

  if (cephClusterObj[0]?.metadata.name === CEPH_EXTERNAL_CR_NAME) {
    return (
      <Modal
        title={t('ceph-storage-plugin~Create Block Pool')}
        titleIconVariant="warning"
        isOpen
        onClose={onClose}
        variant="small"
        isFullScreen={false}
        actions={[
          <Button key="confirm" variant="primary" onClick={onClose}>
            {t('ceph-storage-plugin~Close')}
          </Button>,
        ]}
      >
        <strong>
          {t(
            'ceph-storage-plugin~Pool creation is not available for openshift container storage external mode.',
          )}
        </strong>
      </Modal>
    );
  }

  return (
    <>
      <div className="co-create-operand__header">
        <div className="co-create-operand__header-buttons">
          {memoizedCSV !== null && (
            <BreadCrumbs
              breadcrumbs={[
                {
                  name: memoizedCSV.spec?.displayName,
                  path: url.replace('/~new', ''),
                },
                {
                  name: t('ceph-storage-plugin~Create Block Pool'),
                  path: url,
                },
              ]}
            />
          )}
        </div>

        <h1 className="co-create-operand__header-text">
          {t('ceph-storage-plugin~Create Block Pool')}
        </h1>
        <p className="help-block">
          {t(
            'ceph-storage-plugin~Pools are logical groups of Ceph objects. Such objects live inside of Ceph, or rather they live inside RADOS.',
          )}
        </p>
      </div>
      <div className="ceph-block-pool ceph-block-pool__form">
        {isLoaded && !loadError ? (
          <>
            <PoolBodyComponent cephClusterObj={cephClusterCSV} state={state} dispatch={dispatch} />
            <div className="ceph-block-pool__footer">
              <BlockPoolCreationPageFooter state={state} dispatch={dispatch} cancel={onClose} />
            </div>
          </>
        ) : (
          <LoadingInline />
        )}
      </div>
    </>
  );
};

type BlockPoolCreationPageFooterProps = {
  state: BlockPoolState;
  dispatch: React.Dispatch<BlockPoolAction>;
  cancel: () => void;
};

type BlockPoolCreationPageProps = {
  match: RouteMatch<{ ns: string; appName: string }>;
};

export default BlockPoolCreationPage;

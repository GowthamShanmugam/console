import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ActionGroup, Button } from '@patternfly/react-core';
import { ModalComponentProps } from '@console/internal/components/factory/modal';

import { POOL_PROGRESS } from '../../../constants/storage-pool-const';
import {
  BlockPoolState,
  BlockPoolAction,
  BlockPoolActionType,
  checkRequiredValues,
} from '../../../utils/block-pool';

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

type StoragePoolFooterComponentProps = {
  state: BlockPoolState;
  dispatch: React.Dispatch<BlockPoolAction>;
  onPoolCreation: (name: string) => void;
} & ModalComponentProps;

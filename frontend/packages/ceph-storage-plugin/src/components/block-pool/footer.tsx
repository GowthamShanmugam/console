import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonBar } from '@console/internal/components/utils';
import { ActionGroup, Button } from '@patternfly/react-core';

import {
  BlockPoolState,
  BlockPoolAction,
  BlockPoolActionType,
  checkRequiredValues,
} from '../../utils/block-pool';

import './create-block-pool.scss';

export const PoolFooterComponent = (props: BlockPoolCreationPageFooterProps) => {
  const { state, dispatch, cancel } = props;
  const { t } = useTranslation();

  const poolSubmitAction = () => {
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
          data-test-id="pool-submit-action"
          onClick={poolSubmitAction}
          isDisabled={checkRequiredValues(state)}
        >
          {t('ceph-storage-plugin~Create')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-test-id="pool-cancel-action"
          onClick={cancel}
        >
          {t('ceph-storage-plugin~Cancel')}
        </Button>
      </ActionGroup>
    </ButtonBar>
  );
};

type BlockPoolCreationPageFooterProps = {
  state: BlockPoolState;
  dispatch: React.Dispatch<BlockPoolAction>;
  cancel: () => void;
};

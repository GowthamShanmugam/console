import { modal } from '../../../integration-tests-cypress/views/modal';
import { configureVault } from '../support/vault-standalone';

export const configureKMS = () => {
  configureVault();

  // KMS configuration
  cy.byTestID('advanced-encryption-checkbox').should('be.enabled');
  cy.byTestID('advanced-encryption-checkbox').check();
  cy.byTestID('advanced-encryption-checkbox').should('be.checked');

  cy.log('KMS provider configuration');
  cy.byTestID('kms-provider-dropdown')
    .should('be.disabled')
    .contains('Vault');
  cy.byTestID('kms-service-name-text').type('test_kms_service');
  cy.exec('echo http://$(oc get route vault --no-headers -o custom-columns=HOST:.spec.host)').then(
    (hostname) => {
      cy.byTestID('kms-address-text').type(hostname.stdout);
    },
  );
  cy.byTestID('kms-address-port-text').type('80');
  cy.exec(
    "kubectl get secret vault-token -o go-template='{{.data.token | base64decode}}' -n hashicorp",
  ).then((token) => {
    cy.byTestID('kms-token-text').type(token.stdout);
  });
  cy.byTestID('kms-advanced-settings-link').click();

  // Advanced KMS settings
  modal.modalTitleShouldContain('Key Management Service Advanced Settings');
  cy.byTestID('kms-service-backend-path-text').type('secret');

  // save
  cy.byTestID('confirm-action').click();
};

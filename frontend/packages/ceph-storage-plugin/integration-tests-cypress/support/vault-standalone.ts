import {
    serviceAccountJSON,
    roleBindingJSON,
    getPVCJSON,
    configMapJSON,
    deploymentJson,
    serviceJSON,
    routeJSON,
    networkPolicyJson,
} from '../helpers/vault';


export const configureVault = () => {
    let vaultKey: string = "";
    let vaultToken: string = "";

    cy.exec('oc get project hashicorp', {
        failOnNonZeroExit: false,
      }).then(({ code }) => {
        // Deploy vault only if doesn't already exist
        if (code !== 0) {
            // step 1
            cy.log("Create a new project for internel vault");
            cy.exec("oc new-project hashicorp");
    
            // step 2
            cy.log("Creating kubernetes components");
            cy.exec(`echo '${JSON.stringify(serviceAccountJSON)}' | oc apply -f -`);
            cy.exec(`echo '${JSON.stringify(roleBindingJSON)}' | oc apply -f -`);
            cy.exec(`echo '${JSON.stringify(getPVCJSON)}' | oc apply -f -`);
            cy.exec(`echo '${JSON.stringify(configMapJSON)}' | oc apply -f -`);
    
            // step 3
            cy.log("Deploying vault");
            cy.exec(`echo '${JSON.stringify(deploymentJson)}' | oc apply -f -`);
            cy.exec(`echo '${JSON.stringify(serviceJSON)}' | oc apply -f -`);
            cy.wait(25000) // wait for 2.5 second to pod up and run

            // step 4
            cy.log("Configuring router");
            cy.exec(`echo '${JSON.stringify(routeJSON)}' | oc apply -f -`);
            cy.exec(`echo '${JSON.stringify(networkPolicyJson)}' | oc apply -f -`);

            // step 5
            cy.log("Generating vault keys and token");
            cy.exec('oc get pods -lapp.kubernetes.io/name=vault --no-headers -o custom-columns=NAME:.metadata.name').then((pod) => {
                const podName: string = pod.stdout;
                cy.exec(`oc exec -ti ${podName} -- vault operator init --key-shares=1 --key-threshold=1 --format=json`).then((vault) => {
                    const vaultObj = JSON.parse(vault.stdout);
                    vaultKey = vaultObj["unseal_keys_b64"][0];
                    vaultToken = vaultObj["root_token"];
                    cy.log("Unsealing Vault");
                    cy.exec(`oc exec  -ti ${podName} -- vault operator unseal ${vaultKey}`);
                    cy.log("Enabling a key/value secrets engine");
                    cy.exec(`oc exec  -ti ${podName} -- /bin/sh -c 'export VAULT_TOKEN=${vaultToken} &&  vault secrets enable -path=secret kv'`); 
                    cy.log(`vault token = ${vaultToken}`);
                    cy.exec(`kubectl create secret generic vault-token --from-literal=token=${vaultToken} -n hashicorp`);
                });
            });
        } else {
            cy.log("Vault is already deployed");
        }
    });
};

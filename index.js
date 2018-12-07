const path = require('path');

const opcua = require('node-opcua');

const server = new opcua.OPCUAServer({
    port: 12345,
    nodeset_filename: [
        path.join(__dirname, 'nodesets', 'Opc.Ua.NodeSet2.xml'),
        path.join(__dirname, 'nodesets', 'Opc.Ua.Di.NodeSet2.xml'),
        path.join(__dirname, 'nodesets', 'customnodeset.xml'),
    ],
    userManager: {
        isValidUser: (username, password) => {
            // for this demonstration just accept all credentials ...
            return true;
        },
        getUserRole: (username) => {
            // for this demonstration everyone is an admin ...
            return 'admin';
        }
    },
    allowAnonymous: false
});

return server.start((err) => {
    if (err) {
        return console.log(err);
    }

    const addressSpace = server.engine.addressSpace;

    const index = addressSpace.getNamespaceIndex('http://yourorganisation.org/customnodeset/');
    const node = addressSpace.findNode(`ns=${index};i=6001`);
    if (node) {
        node.bindVariable({
            get: () => {
                return new opcua.Variant({
                        dataType: opcua.DataType.Double,
                        value: Math.random() * 10 + 20
                    }
                );
            },
            set: (variant) => {
                console.log('this never gets called anyways :(');
                return opcua.StatusCodes.Good;
            },
            permissions: {
                CurrentRead: ["*"], // everyone
                CurrentWrite: ["*"] // everyone
            }
        }, {overwrite: true});
        node.userAccessLevel = opcua.makeAccessLevel("CurrentRead | CurrentWrite");
        node.accessLevel = opcua.makeAccessLevel("CurrentRead | CurrentWrite");
    }

    const endpoints = server.endpoints[0].endpointDescriptions();
    for (let endpoint of endpoints) {
        console.log(endpoint.endpointUrl, endpoint.securityMode.toString(), endpoint.securityPolicyUri.toString());
    }
    return console.log('listening ...');
});
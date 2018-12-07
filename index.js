const path = require('path');
const crypto = require('crypto');

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
            if (username === 'admin') {
                return password === 'admin';
            } else if (username === 'guest') {
                return password === 'guest';
            }
            return false;
        },
        getUserRole: (username) => {
            if (username === 'admin') {
                return 'admin';
            }
            return 'default';
        }
    },
    allowAnonymous: false
});

const nodeValueGenerators = {
    '6001': () => {
        return Math.random() * 10 + 20
    },
    '6002': () => {
        return Math.random() < 0.5
    },
    '6003': () => {
        return crypto.randomBytes(4).toString('hex')
    },
    '6004': () => {
        return Math.floor(Math.random() * 100);
    }
};

return server.start((err) => {
    if (err) {
        return console.log(err);
    }

    const addressSpace = server.engine.addressSpace;

    const index = addressSpace.getNamespaceIndex('http://yourorganisation.org/customnodeset/');
    for (let nodeId in nodeValueGenerators) {
        const node = addressSpace.findNode(`ns=${index};i=${nodeId}`);
        if (node) {
            const dataType = addressSpace.findNode(node.dataType).browseName.name;
            node.bindVariable({
                get: () => {
                    return new opcua.Variant({
                            dataType: dataType,
                            value: nodeValueGenerators[nodeId]()
                        }
                    );
                },
                set: (variant) => {
                    console.log(`set called for node '${node.browseName}', value: '${variant.value}' (${variant.dataType.key})`);
                    return opcua.StatusCodes.Good;
                }
            }, {overwrite: true});
            node.userAccessLevel = opcua.makeAccessLevel("CurrentRead | CurrentWrite"); // without write flag here no one can write at all
            node.accessLevel = opcua.makeAccessLevel("CurrentRead | CurrentWrite");
            node.permissions = {
                CurrentRead: ['*'],
                CurrentWrite: ['!*', 'admin'] // ... but guest can also do this?
            }
        }
    }

    const endpoints = server.endpoints[0].endpointDescriptions();
    for (let endpoint of endpoints) {
        console.log(endpoint.endpointUrl, endpoint.securityMode.toString(), endpoint.securityPolicyUri.toString());
    }
    return console.log('listening ...');
});
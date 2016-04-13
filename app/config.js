var Etcd = require('node-etcd');

var etcdHost = process.env.ETCD_HOST || '172.17.8.101';
var etcdPort = process.env.ETCD_PORT || 4001;
var standalone = process.env.STANDALONE || false;
var rethink;
if (standalone) {
  rethink = "rethinkdb";
} else {
  console.log('Connecting to etcd on '+etcdHost+':'+etcdPort);
  var etcd = new Etcd(etcdHost, etcdPort);

  var rethinks = etcd.getSync("/services/rethinkdb", {recursive: true})

  var nodes = rethinks.body.node.nodes;
  nodes.forEach(function (node){
    console.log('Available rethinkdb server on', node.value);
  });
  rethink = nodes[0].value;
  console.log('Connecting to Rethinkdb on', rethink)
}

module.exports = {
  rethinkdb: {
    host: rethink,
    port: 28015,
    authKey: '',
    db: 'rethink_ex'
  },
  express: {
     port: 3000
  }
};


// Runs as the mongo container's healthcheck. On first boot rs.status() throws
// because the replica set is not initiated yet, so initiate it; then report
// healthy only once this node is a writable primary.
try {
  rs.status();
} catch {
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] });
}
quit(db.hello().isWritablePrimary ? 0 : 1);

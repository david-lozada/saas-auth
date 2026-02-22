// docker/shared/mongo-init.js
db = db.getSiblingDB('project_a_auth');

// Create app user with readWrite role
db.createUser({
  user: 'appuser',
  pwd: 'apppassword',
  roles: [{ role: 'readWrite', db: 'project_a_auth' }]
});

// Create indexes
db.users.createIndex({ email: 1, tenantId: 1 }, { unique: true });
db.users.createIndex({ tenantId: 1, roles: 1 });
db.devices.createIndex({ userId: 1, tenantId: 1 });
db.devices.createIndex({ deviceId: 1, tenantId: 1 });
db.tenants.createIndex({ slug: 1 }, { unique: true });
db.invites.createIndex({ code: 1, tenantId: 1 }, { unique: true });
db.invites.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('Database initialized with auth');
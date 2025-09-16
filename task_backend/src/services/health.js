class HealthService {
  getStatus() {
    // Read flags stored by server during startup (may be undefined early)
    const app = require('express')();
    const environment = process.env.NODE_ENV || 'development';
    return {
      status: 'ok',
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      environment,
      // These flags are mirrored on app.locals by server.js; expose simplified booleans
      config: {
        jwtReady: !!process.env.JWT_SECRET,
        // Do not leak secrets; just presence
        mysqlConfigured: !!(process.env.MYSQL_URL || (process.env.MYSQL_HOST && (process.env.MYSQL_DB || process.env.MYSQL_DATABASE))),
        allowStartWithoutDb: String(process.env.ALLOW_START_WITHOUT_DB || '').toLowerCase() === 'true',
      },
    };
  }
}

module.exports = new HealthService();

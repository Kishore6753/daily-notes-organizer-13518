class HealthService {
  getStatus() {
    // health summary for root endpoint
    const environment = process.env.NODE_ENV || 'development';
    return {
      status: 'ok',
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      environment,
      config: {
        jwtReady: !!process.env.JWT_SECRET,
        mysqlConfigured: !!(process.env.MYSQL_URL || (process.env.MYSQL_HOST && (process.env.MYSQL_DB || process.env.MYSQL_DATABASE))),
        allowStartWithoutDb: String(process.env.ALLOW_START_WITHOUT_DB || '').toLowerCase() === 'true',
      },
    };
  }

  // PUBLIC_INTERFACE
  /**
   * Initialization status for troubleshooting startup/config issues affecting /login.
   * Returns details about JWT secret, MySQL env, DB connectivity, and actionable hints.
   */
  getInitStatus(app) {
    const environment = process.env.NODE_ENV || 'development';
    const jwtReady = !!process.env.JWT_SECRET;
    const mysqlConfigured = !!(process.env.MYSQL_URL || (process.env.MYSQL_HOST && (process.env.MYSQL_DB || process.env.MYSQL_DATABASE)));
    const mysqlMissing = (app?.locals?.configSummary?.mysqlMissing) || [];
    const dbReady = !!(app?.locals?.dbReady);
    const lastDbError = app?.locals?.lastDbError || null;
    const allowStartWithoutDb = String(process.env.ALLOW_START_WITHOUT_DB || '').toLowerCase() === 'true';

    const canLogin = jwtReady && dbReady;

    const hints = [];
    if (!jwtReady) {
      hints.push('Set JWT_SECRET in environment. In production, do not rely on auto-generated dev secrets.');
    }
    if (!mysqlConfigured || mysqlMissing.length) {
      hints.push('Provide MYSQL_URL or discrete MYSQL_* variables (HOST, PORT, USER, PASSWORD, and MYSQL_DB or MYSQL_DATABASE).');
    }
    if (!dbReady) {
      hints.push('Ensure MySQL is reachable from the backend and credentials are correct. Check /db/health for connectivity details.');
    }
    hints.push('Frontend should call API via public HTTPS URL (reverse proxy), not HTTP directly.');
    hints.push('If CORS errors appear, set FRONTEND_ORIGIN to the public frontend URL.');

    return {
      status: canLogin ? 'ready' : 'blocked',
      environment,
      timestamp: new Date().toISOString(),
      checks: {
        jwtSecret: { ok: jwtReady },
        mysqlEnv: { ok: mysqlConfigured && mysqlMissing.length === 0, missing: mysqlMissing },
        dbConnectivity: { ok: dbReady, error: lastDbError },
      },
      canLogin,
      allowStartWithoutDb,
      hints,
    };
  }
}

module.exports = new HealthService();

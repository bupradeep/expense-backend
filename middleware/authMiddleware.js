const jwt = require('jsonwebtoken');
const { getUserByEmployeeObjectId } = require('../services/userService');
const jwksRsa = require('jwks-rsa');

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;

// Entra ID issues v2.0 tokens with this issuer shape for a given tenant.
const expectedIssuer = tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : null;


const client = tenantId
  ? jwksRsa({
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 24 * 60 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 5
    })
  : null;

function getSigningKey(header, callback) {
  if (!client) {
    return callback(new Error('AZURE_TENANT_ID is not configured'));
  }

  client.getSigningKey(header.kid, (error, key) => {
    if (error) return callback(error);
    callback(null, key.getPublicKey());
  });
}

function extractToken(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        audience: clientId,
        issuer: expectedIssuer,
        clockTolerance: 5
      },
      (error, payload) => (error ? reject(error) : resolve(payload))
    );
  });
}

async function authenticate(req, res, next) {
  if (!tenantId || !clientId) {
    return res.status(500).json({ message: 'Auth is not configured (AZURE_TENANT_ID / AZURE_CLIENT_ID missing)' });
  }

  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Missing Authorization bearer token' });
  }

  let payload;

  try {
    payload = await verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: `Invalid token: ${error.message}` });
    }

    return next(error);
  }

  const objectId = payload.oid || payload.sub;

  if (!objectId) {
    return res.status(401).json({ message: 'Token is missing an object id (oid) claim' });
  }

  let user;

  try {
    user = await getUserByEmployeeObjectId(objectId);
  } catch (error) {
    return res.status(403).json({ message: 'No local account is provisioned for this identity' });
  }

  if (!user.IsActive) {
    return res.status(403).json({ message: 'This account is inactive' });
  }

  req.user = {
    userId: user.UserId,
    fullName: user.FullName,
    email: user.Email,
    role: user.Role,
    departmentId: user.DepartmentId,
    employeeObjectId: user.EmployeeObjectId
  };

  next();
}

module.exports = { authenticate };

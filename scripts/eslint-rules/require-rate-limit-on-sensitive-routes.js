'use strict';

const path = require('node:path');

const SENSITIVE_ROUTES = new Set([
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/auth/me/route.ts',
  'src/app/api/setup/execute/route.ts',
  'src/app/api/setup/test-db/route.ts',
  'src/app/api/setup/test-ldap/route.ts',
  'src/app/api/setup/status/route.ts',
  'src/app/api/eps/import/analyze/route.ts',
  'src/app/api/eps/import/execute/route.ts',
  'src/app/api/eps/import/template/route.ts',
  'src/app/api/eps/reports/generate/route.ts',
  'src/app/api/eps/reports/templates/route.ts',
  'src/app/api/eps/reports/templates/[id]/route.ts',
]);

function relativeWebPath(filename) {
  const marker = `${path.sep}apps${path.sep}web${path.sep}`;
  const index = filename.lastIndexOf(marker);
  const relative = index >= 0 ? filename.slice(index + marker.length) : filename;
  return relative.split(path.sep).join('/');
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require enforceRateLimit() in registered sensitive API routes' },
    schema: [],
    messages: {
      missing: 'Sensitive API route must call enforceRateLimit().',
    },
  },
  create(context) {
    if (!SENSITIVE_ROUTES.has(relativeWebPath(context.getFilename()))) return {};

    let found = false;
    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'enforceRateLimit') {
          found = true;
        }
      },
      'Program:exit'(node) {
        if (!found) context.report({ node, messageId: 'missing' });
      },
    };
  },
};

'use strict';

const path = require('node:path');

const ROUTES = new Set([
  'src/app/api/modules/status/route.ts',
  'src/app/api/setup/execute/route.ts',
  'src/app/api/wms/operations/route.ts',
  'src/app/api/wms/transfers/route.ts',
  'src/app/api/wms/transfers/[id]/dispatch/route.ts',
  'src/app/api/wms/transfers/[id]/receive/route.ts',
  'src/app/api/wms/transfers/[id]/reject/route.ts',
  'src/app/api/eps/equipment/[id]/documents/route.ts',
  'src/app/api/eps/equipment/[id]/photos/route.ts',
  'src/app/api/srm/issues/[id]/create-mro-order/route.ts',
  'src/app/api/admin/users/route.ts',
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
    docs: { description: 'Require sanitized server-error responses on guarded routes' },
    schema: [],
    messages: {
      missing: 'Guarded API route must call safeErrorResponse().',
      leak: 'API response must not expose error.message directly.',
    },
  },
  create(context) {
    if (!ROUTES.has(relativeWebPath(context.getFilename()))) return {};

    let foundSafeResponse = false;
    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'safeErrorResponse') {
          foundSafeResponse = true;
        }
      },
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'error' &&
          node.value.type === 'MemberExpression' &&
          !node.value.computed &&
          node.value.object.type === 'Identifier' &&
          node.value.object.name === 'error' &&
          node.value.property.type === 'Identifier' &&
          node.value.property.name === 'message'
        ) {
          context.report({ node, messageId: 'leak' });
        }
      },
      'Program:exit'(node) {
        if (!foundSafeResponse) context.report({ node, messageId: 'missing' });
      },
    };
  },
};

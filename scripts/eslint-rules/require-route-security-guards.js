'use strict';

const path = require('node:path');

function relativeWebPath(filename) {
  const marker = `${path.sep}apps${path.sep}web${path.sep}`;
  const index = filename.lastIndexOf(marker);
  const relative = index >= 0 ? filename.slice(index + marker.length) : filename;
  return relative.split(path.sep).join('/');
}

const REQUIREMENTS = {
  'src/app/api/modules/status/route.ts': [
    ['module-admin-permission', /hasPermission\(user,\s*PERMISSIONS\.ADMIN_SETTINGS_MANAGE\)/g, 2],
  ],
  'src/app/api/files/[...path]/route.ts': [
    ['files-authentication', /getCurrentUser\(req\)/, 1],
    ['files-path-normalization', /normalizeStoredFilePath/, 1],
    ['files-object-access', /canReadStoredFile/, 1],
    ['files-traversal-boundary', /resolvedFullPath\.startsWith\(uploadRoot\)/, 1],
  ],
  'src/app/api/setup/execute/route.ts': [
    ['setup-reinstallation-guard', /fileInstalled[\s\S]*?!user\s*\|\|\s*!isAdminUser\(user\)/, 1],
  ],
  'src/app/api/setup/test-db/route.ts': [
    ['setup-reinstallation-guard', /fileInstalled[\s\S]*?!user\s*\|\|\s*!isAdminUser\(user\)/, 1],
  ],
  'src/app/api/setup/test-ldap/route.ts': [
    ['setup-reinstallation-guard', /fileInstalled[\s\S]*?!user\s*\|\|\s*!isAdminUser\(user\)/, 1],
  ],
  'src/app/api/srm/integrations/route.ts': [
    ['active-srm-auth-policy', /Boolean\(isActive\)\s*&&\s*!hasSecureSrmWebhookAuth\(authConfig\)/, 1],
  ],
  'src/app/api/srm/integrations/[id]/route.ts': [
    ['active-srm-auth-policy', /resolvedIsActive\s*&&\s*!hasSecureSrmWebhookAuth\(resolvedAuthConfig\)/, 1],
  ],
};

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require route-specific security guards' },
    schema: [],
    messages: {
      missing: 'Missing required route security guard: {{guard}}.',
    },
  },
  create(context) {
    const requirements = REQUIREMENTS[relativeWebPath(context.getFilename())];
    if (!requirements) return {};

    return {
      'Program:exit'(node) {
        const source = context.getSourceCode().text;
        for (const [guard, pattern, expectedCount] of requirements) {
          const matches = source.match(pattern) ?? [];
          const actualCount = pattern.global ? matches.length : matches.length > 0 ? 1 : 0;
          if (actualCount < expectedCount) {
            context.report({ node, messageId: 'missing', data: { guard } });
          }
        }
      },
    };
  },
};

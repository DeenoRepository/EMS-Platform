'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid console calls in API routes; use the structured logger' },
    schema: [],
    messages: {
      forbidden: 'API routes must use @/lib/logger instead of console.{{method}}().',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          !node.computed &&
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          node.property.type === 'Identifier'
        ) {
          context.report({
            node,
            messageId: 'forbidden',
            data: { method: node.property.name },
          });
        }
      },
    };
  },
};

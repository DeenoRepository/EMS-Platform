import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedOutboundIp, validateOutboundUrl } from '../outbound-url';

const ORIGINAL_ALLOWED_HOSTS = process.env.OUTBOUND_ALLOWED_HOSTS;

afterEach(() => {
  if (ORIGINAL_ALLOWED_HOSTS === undefined) {
    delete process.env.OUTBOUND_ALLOWED_HOSTS;
  } else {
    process.env.OUTBOUND_ALLOWED_HOSTS = ORIGINAL_ALLOWED_HOSTS;
  }
});

describe('outbound URL validation', () => {
  test('allows a public HTTPS hostname after a public DNS lookup', async () => {
    const result = await validateOutboundUrl('https://jira.example.com/rest/api/2/myself', {
      allowedSchemes: ['https:'],
      lookup: async () => ['203.0.113.10'],
    });

    assert.deepEqual(result.ok, true);
  });

  test('rejects unsupported protocols and embedded credentials', async () => {
    const protocolResult = await validateOutboundUrl('file:///etc/passwd', {
      allowedSchemes: ['https:'],
    });
    const credentialsResult = await validateOutboundUrl('https://user:secret@jira.example.com', {
      allowedSchemes: ['https:'],
      lookup: async () => ['203.0.113.10'],
    });

    assert.equal(protocolResult.ok, false);
    assert.equal(credentialsResult.ok, false);
  });

  test('rejects loopback, private, link-local and multicast IP literals', () => {
    for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '224.0.0.1', '::1', 'fc00::1', 'fe80::1']) {
      assert.equal(isBlockedOutboundIp(address), true, address);
    }
  });

  test('rejects hostnames resolving to private addresses', async () => {
    const result = await validateOutboundUrl('ldaps://directory.example.local', {
      allowedSchemes: ['ldap:', 'ldaps:'],
      lookup: async () => ['10.20.30.40'],
    });

    assert.equal(result.ok, false);
  });

  test('rejects mixed DNS results containing a private address', async () => {
    const result = await validateOutboundUrl('https://mixed.example.com', {
      allowedSchemes: ['https:'],
      lookup: async () => ['203.0.113.10', '192.168.1.20'],
    });

    assert.equal(result.ok, false);
  });

  test('permits an explicit internal hostname allowlist entry', async () => {
    const result = await validateOutboundUrl('ldap://ad.company.local:389', {
      allowedSchemes: ['ldap:', 'ldaps:'],
      allowedHosts: ['ad.company.local'],
      lookup: async () => ['10.0.0.10'],
    });

    assert.equal(result.ok, true);
  });

  test('reads the configured hostname allowlist from the environment', async () => {
    process.env.OUTBOUND_ALLOWED_HOSTS = 'jira.company.local, ldap.company.local';

    const result = await validateOutboundUrl('https://jira.company.local', {
      allowedSchemes: ['https:'],
      lookup: async () => ['192.168.1.20'],
    });

    assert.equal(result.ok, true);
  });

  test('rejects DNS lookup failures', async () => {
    const result = await validateOutboundUrl('https://unresolvable.example.com', {
      allowedSchemes: ['https:'],
      lookup: async () => {
        throw new Error('DNS lookup failed');
      },
    });

    assert.equal(result.ok, false);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isBlockedOutboundIp, validateOutboundUrl } from './outbound-url';

describe('outbound URL validation', () => {
  it('blocks private, loopback, multicast, and invalid addresses', () => {
    assert.equal(isBlockedOutboundIp('127.0.0.1'), true);
    assert.equal(isBlockedOutboundIp('10.0.0.4'), true);
    assert.equal(isBlockedOutboundIp('224.0.0.1'), true);
    assert.equal(isBlockedOutboundIp('not-an-ip'), true);
  });

  it('allows public IP addresses and configured internal hosts', async () => {
    const publicResult = await validateOutboundUrl('https://8.8.8.8/api', {
      allowedSchemes: ['https:'],
    });
    const allowedHostResult = await validateOutboundUrl('http://internal.example/api', {
      allowedSchemes: ['http:'],
      allowedHosts: [' INTERNAL.EXAMPLE '],
      lookup: async () => ['127.0.0.1'],
    });

    assert.equal(publicResult.ok, true);
    assert.equal(allowedHostResult.ok, true);
  });

  it('rejects malformed URLs, schemes, and credentials', async () => {
    assert.equal(
      (await validateOutboundUrl('not a url', { allowedSchemes: ['https:'] })).ok,
      false,
    );
    assert.equal(
      (await validateOutboundUrl('ftp://example.com', { allowedSchemes: ['https:'] })).ok,
      false,
    );
    assert.equal(
      (await validateOutboundUrl('https://user:pass@example.com', { allowedSchemes: ['https:'] })).ok,
      false,
    );
    assert.equal(
      (await validateOutboundUrl('https://8.8.8.8', { allowedSchemes: ['https:'] })).ok,
      true,
    );
  });

  it('rejects DNS resolutions to private or empty addresses and reports lookup failures', async () => {
    const privateResult = await validateOutboundUrl('https://service.example', {
      allowedSchemes: ['https:'],
      lookup: async () => ['93.184.216.34', '192.168.1.10'],
    });
    const emptyResult = await validateOutboundUrl('https://service.example', {
      allowedSchemes: ['https:'],
      lookup: async () => [],
    });
    const failedResult = await validateOutboundUrl('https://service.example', {
      allowedSchemes: ['https:'],
      lookup: async () => {
        throw new Error('DNS failure');
      },
    });

    assert.equal(privateResult.ok, false);
    assert.equal(emptyResult.ok, false);
    assert.equal(failedResult.ok, false);
  });
});

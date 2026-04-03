const assert = require('assert');
const net = require('net');
const { Pool } = require('pg');
const { pool: servicePool } = require('../src/db/client');
const { ensureAccessLogSchema } = require('../src/db/schema');

const adminBaseUrl = process.env.TEST_ADMIN_BASE_URL || 'http://admin-service:4000';
const proxyBaseUrl = process.env.TEST_PROXY_BASE_URL || 'http://proxy-service:3000';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function buildUrl(baseUrl, path, query = {}) {
  const url = new URL(path, baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

async function httpRequest(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'manual',
    ...options
  });

  return response;
}

async function login(email, password) {
  const response = await httpRequest(buildUrl(adminBaseUrl, '/login'), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ email, password }).toString()
  });

  assert.strictEqual(response.status, 302, 'login should redirect on success');

  const cookie = response.headers.get('set-cookie');
  assert(cookie && cookie.includes('wf_admin_sid='), 'login should set session cookie');

  return cookie.split(';')[0];
}

async function submitForm(url, formData, cookie) {
  return httpRequest(url, {
    method: 'POST',
    headers: {
      ...headersWithCookie(cookie),
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(formData).toString()
  });
}

async function requestJson(url, { method = 'GET', cookie, body } = {}) {
  const headers = {
    ...headersWithCookie(cookie)
  };

  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await httpRequest(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : null
  };
}

function headersWithCookie(cookie) {
  return cookie ? { cookie } : {};
}

function connectThroughProxy(authority) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(3000, 'proxy-service');
    let data = '';
    let settled = false;

    function finish(error, result) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();

      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    }

    socket.setTimeout(5000, () => finish(new Error(`CONNECT timeout for ${authority}`)));
    socket.on('error', (error) => finish(error));
    socket.on('connect', () => {
      socket.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`);
    });
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8');

      if (!data.includes('\r\n\r\n')) {
        return;
      }

      const statusLine = data.split('\r\n', 1)[0];
      finish(null, statusLine);
    });
  });
}

async function fetchText(url, options = {}) {
  const response = await httpRequest(url, options);
  const body = await response.text();

  return { response, body };
}

async function getRuleHitCount(target) {
  const result = await pool.query(
    'SELECT hit_count FROM rules WHERE target = $1 LIMIT 1',
    [target]
  );

  return result.rows[0] ? Number(result.rows[0].hit_count) : 0;
}

async function run() {
  const createdTestValues = {
    domainTarget: `manual-block-${Date.now()}.local`,
    keyword: `manualblocked${Date.now()}`,
    apiRuleTarget: `api-block-${Date.now()}.local`,
    apiRuleTargetUpdated: `api-block-updated-${Date.now()}.local`,
    apiKeyword: `apiblocked${Date.now()}`,
    apiKeywordUpdated: `apiblockedupdated${Date.now()}`,
    apiExtension: '.api01',
    apiExtensionUpdated: '.api02'
  };

  try {
    const dashboardRedirect = await httpRequest(buildUrl(adminBaseUrl, '/dashboard'));
    assert.strictEqual(dashboardRedirect.status, 302, 'dashboard should redirect when unauthenticated');
    assert.strictEqual(dashboardRedirect.headers.get('location'), '/login');

    const viewerCookie = await login(
      process.env.VIEWER_DEFAULT_EMAIL || 'viewer@local.test',
      process.env.VIEWER_DEFAULT_PASSWORD || 'viewer123456'
    );

    const viewerDashboard = await httpRequest(buildUrl(adminBaseUrl, '/dashboard'), {
      headers: headersWithCookie(viewerCookie)
    });
    assert.strictEqual(viewerDashboard.status, 200, 'viewer should access dashboard');

    const viewerRules = await httpRequest(buildUrl(adminBaseUrl, '/rules'), {
      headers: headersWithCookie(viewerCookie)
    });
    assert.strictEqual(viewerRules.status, 403, 'viewer should be blocked from rules page');

    const adminCookie = await login(
      process.env.ADMIN_DEFAULT_EMAIL || 'admin@local.test',
      process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456'
    );

    const adminRules = await httpRequest(buildUrl(adminBaseUrl, '/rules'), {
      headers: headersWithCookie(adminCookie)
    });
    assert.strictEqual(adminRules.status, 200, 'admin should access rules page');

    const createRuleResponse = await submitForm(
      buildUrl(adminBaseUrl, '/rules'),
      {
        type: 'domain',
        action: 'block',
        priority: '120',
        target: createdTestValues.domainTarget,
        scope_type: 'global',
        scope_value: '',
        description: 'Integration test managed rule'
      },
      adminCookie
    );
    assert.strictEqual(createRuleResponse.status, 302, 'admin should be able to create a rule');

    const createdRuleBlock = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: `http://${createdTestValues.domainTarget}/`
    }));
    assert.strictEqual(createdRuleBlock.response.status, 403, 'new admin-created domain rule should block immediately');

    const createKeywordResponse = await submitForm(
      buildUrl(adminBaseUrl, '/keywords'),
      {
        keyword: createdTestValues.keyword,
        description: 'Integration test managed keyword'
      },
      adminCookie
    );
    assert.strictEqual(createKeywordResponse.status, 302, 'admin should be able to create a keyword');

    const createdKeywordBlock = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: `http://admin-service:4000/health?probe=${createdTestValues.keyword}`
    }));
    assert.strictEqual(createdKeywordBlock.response.status, 403, 'new admin-created keyword should block immediately');

    const rulesApi = await httpRequest(buildUrl(adminBaseUrl, '/api/rules'), {
      headers: headersWithCookie(adminCookie)
    });
    assert.strictEqual(rulesApi.status, 200, 'admin should access rules API');

    const createdRuleApi = await requestJson(buildUrl(adminBaseUrl, '/api/rules'), {
      method: 'POST',
      cookie: adminCookie,
      body: {
        type: 'domain',
        action: 'block',
        target: createdTestValues.apiRuleTarget,
        description: 'API CRUD rule',
        priority: 130,
        scope_type: 'global',
        scope_value: ''
      }
    });
    assert.strictEqual(createdRuleApi.response.status, 201, 'rule API should create a rule');

    const ruleId = createdRuleApi.body.id;
    const fetchedRuleApi = await requestJson(buildUrl(adminBaseUrl, `/api/rules/${ruleId}`), {
      cookie: adminCookie
    });
    assert.strictEqual(fetchedRuleApi.response.status, 200, 'rule API should fetch one rule');
    assert.strictEqual(fetchedRuleApi.body.target, createdTestValues.apiRuleTarget, 'fetched rule should match created target');

    const updatedRuleApi = await requestJson(buildUrl(adminBaseUrl, `/api/rules/${ruleId}`), {
      method: 'PATCH',
      cookie: adminCookie,
      body: {
        target: createdTestValues.apiRuleTargetUpdated,
        priority: 140,
        description: 'API CRUD rule updated'
      }
    });
    assert.strictEqual(updatedRuleApi.response.status, 200, 'rule API should update a rule');
    assert.strictEqual(updatedRuleApi.body.target, createdTestValues.apiRuleTargetUpdated, 'rule target should update');

    const toggledRuleApi = await requestJson(buildUrl(adminBaseUrl, `/api/rules/${ruleId}/toggle`), {
      method: 'PATCH',
      cookie: adminCookie
    });
    assert.strictEqual(toggledRuleApi.response.status, 200, 'rule API should toggle a rule');
    assert.strictEqual(toggledRuleApi.body.is_active, false, 'rule toggle should deactivate rule');

    const ruleAfterDisable = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: `http://${createdTestValues.apiRuleTargetUpdated}/`
    }));
    assert.notStrictEqual(ruleAfterDisable.response.status, 403, 'disabled API rule should no longer block');

    const toggledRuleBackApi = await requestJson(buildUrl(adminBaseUrl, `/api/rules/${ruleId}/toggle`), {
      method: 'PATCH',
      cookie: adminCookie
    });
    assert.strictEqual(toggledRuleBackApi.body.is_active, true, 'rule toggle should reactivate rule');

    const ruleAfterEnable = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: `http://${createdTestValues.apiRuleTargetUpdated}/`
    }));
    assert.strictEqual(ruleAfterEnable.response.status, 403, 'reactivated API rule should block');

    const createdKeywordApi = await requestJson(buildUrl(adminBaseUrl, '/api/keywords'), {
      method: 'POST',
      cookie: adminCookie,
      body: {
        keyword: createdTestValues.apiKeyword,
        description: 'API CRUD keyword'
      }
    });
    assert.strictEqual(createdKeywordApi.response.status, 201, 'keyword API should create a keyword');

    const keywordId = createdKeywordApi.body.id;
    const updatedKeywordApi = await requestJson(buildUrl(adminBaseUrl, `/api/keywords/${keywordId}`), {
      method: 'PATCH',
      cookie: adminCookie,
      body: {
        keyword: createdTestValues.apiKeywordUpdated,
        description: 'API CRUD keyword updated'
      }
    });
    assert.strictEqual(updatedKeywordApi.response.status, 200, 'keyword API should update a keyword');

    const keywordBlock = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: `http://admin-service:4000/health?probe=${createdTestValues.apiKeywordUpdated}`
    }));
    assert.strictEqual(keywordBlock.response.status, 403, 'updated API keyword should block immediately');

    const toggledKeywordApi = await requestJson(buildUrl(adminBaseUrl, `/api/keywords/${keywordId}/toggle`), {
      method: 'PATCH',
      cookie: adminCookie
    });
    assert.strictEqual(toggledKeywordApi.body.is_active, false, 'keyword toggle should deactivate keyword');

    const keywordAfterDisable = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: `http://admin-service:4000/health?probe=${createdTestValues.apiKeywordUpdated}`
    }));
    assert.notStrictEqual(keywordAfterDisable.response.status, 403, 'disabled keyword should no longer block');

    const createdExtensionApi = await requestJson(buildUrl(adminBaseUrl, '/api/extensions'), {
      method: 'POST',
      cookie: adminCookie,
      body: {
        extension: createdTestValues.apiExtension,
        description: 'API CRUD extension'
      }
    });
    assert.strictEqual(createdExtensionApi.response.status, 201, 'extension API should create an extension');

    const extensionId = createdExtensionApi.body.id;
    const fetchedExtensionApi = await requestJson(buildUrl(adminBaseUrl, `/api/extensions/${extensionId}`), {
      cookie: adminCookie
    });
    assert.strictEqual(fetchedExtensionApi.response.status, 200, 'extension API should fetch one extension');

    const updatedExtensionApi = await requestJson(buildUrl(adminBaseUrl, `/api/extensions/${extensionId}`), {
      method: 'PATCH',
      cookie: adminCookie,
      body: {
        extension: createdTestValues.apiExtensionUpdated,
        description: 'API CRUD extension updated'
      }
    });
    assert.strictEqual(updatedExtensionApi.response.status, 200, 'extension API should update an extension');
    assert.strictEqual(updatedExtensionApi.body.extension, createdTestValues.apiExtensionUpdated, 'extension should update');

    const deletedExtensionApi = await requestJson(buildUrl(adminBaseUrl, `/api/extensions/${extensionId}`), {
      method: 'DELETE',
      cookie: adminCookie
    });
    assert.strictEqual(deletedExtensionApi.response.status, 200, 'extension API should delete an extension');

    const missingExtensionApi = await requestJson(buildUrl(adminBaseUrl, `/api/extensions/${extensionId}`), {
      cookie: adminCookie
    });
    assert.strictEqual(missingExtensionApi.response.status, 404, 'deleted extension should return 404');

    const deletedKeywordApi = await requestJson(buildUrl(adminBaseUrl, `/api/keywords/${keywordId}`), {
      method: 'DELETE',
      cookie: adminCookie
    });
    assert.strictEqual(deletedKeywordApi.response.status, 200, 'keyword API should delete a keyword');

    const deletedRuleApi = await requestJson(buildUrl(adminBaseUrl, `/api/rules/${ruleId}`), {
      method: 'DELETE',
      cookie: adminCookie
    });
    assert.strictEqual(deletedRuleApi.response.status, 200, 'rule API should delete a rule');

    const missingRuleApi = await requestJson(buildUrl(adminBaseUrl, `/api/rules/${ruleId}`), {
      cookie: adminCookie
    });
    assert.strictEqual(missingRuleApi.response.status, 404, 'deleted rule should return 404');

    const proxyHealth = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: 'http://admin-service:4000/health'
    }));
    assert.strictEqual(proxyHealth.response.status, 200, 'proxy should allow local health request');
    assert(proxyHealth.body.includes('"status":"ok"'), 'proxy health body should include ok status');

    const facebookHitsBefore = await getRuleHitCount('facebook.com');
    const blockedDomain = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: 'http://facebook.com/'
    }));
    assert.strictEqual(blockedDomain.response.status, 403, 'proxy should block blacklisted domain');

    const facebookHitsAfter = await getRuleHitCount('facebook.com');
    assert(facebookHitsAfter > facebookHitsBefore, 'domain rule hit counter should increase after block');

    const blockedKeyword = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: 'http://admin-service:4000/demo/blocked-content'
    }));
    assert.strictEqual(blockedKeyword.response.status, 403, 'proxy should block response keyword');

    const blockedResponseExtension = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: 'http://admin-service:4000/demo/download-installer'
    }));
    assert.strictEqual(blockedResponseExtension.response.status, 403, 'proxy should block response extension');

    const blockedRequestExtension = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: 'http://admin-service:4000/file.exe'
    }));
    assert.strictEqual(blockedRequestExtension.response.status, 403, 'proxy should block request extension');

    const connectAllow = await connectThroughProxy('admin-service:4000');
    assert(connectAllow.includes('200 Connection Established'), 'CONNECT should allow trusted internal tunnel');

    const connectBlock = await connectThroughProxy('facebook.com:443');
    assert(connectBlock.includes('403 Forbidden'), 'CONNECT should block blacklisted domain');

    const proxyError = await fetchText(buildUrl(proxyBaseUrl, '/proxy', {
      url: 'http://nonexistent-host-for-review.invalid/'
    }));
    assert(proxyError.response.status >= 400, 'proxy error case should return an error status');

    const insertedRows = await pool.query(
      `INSERT INTO access_logs (
         request_method,
         url,
         domain,
         client_ip,
         decision,
         matched_rule,
         status_code,
         blocked_reason
       ) VALUES
         ('GET', 'http://legacy-backfill.local/file.exe', 'legacy-backfill.local', '127.0.0.1', 'block', 'extension:block:.exe', 403, 'legacy block'),
         ('GET', 'http://legacy-backfill.local/health', 'legacy-backfill.local', '127.0.0.1', 'allow', NULL, 200, NULL)
       RETURNING id`
    );

    await ensureAccessLogSchema();

    const normalizedRows = await pool.query(
      `SELECT id, decision, rule_stage, upstream_status, detected_extension, final_url
       FROM access_logs
       WHERE id = ANY($1::bigint[])
       ORDER BY id ASC`,
      [insertedRows.rows.map((row) => row.id)]
    );

    assert.strictEqual(normalizedRows.rows[0].rule_stage, 'request:extension', 'legacy extension log should be backfilled');
    assert.strictEqual(normalizedRows.rows[0].detected_extension, '.exe', 'legacy extension should be detected');
    assert.strictEqual(normalizedRows.rows[1].rule_stage, 'response:pass', 'legacy allow log should be backfilled');
    assert.strictEqual(Number(normalizedRows.rows[1].upstream_status), 200, 'legacy allow log should infer upstream status');
    assert.strictEqual(normalizedRows.rows[1].final_url, 'http://legacy-backfill.local/health', 'legacy allow log should infer final URL');

    console.log('Integration test suite passed.');
  } finally {
    await pool.query('DELETE FROM keywords WHERE keyword = $1', [createdTestValues.keyword]);
    await pool.query(
      'DELETE FROM keywords WHERE keyword = ANY($1::text[])',
      [[createdTestValues.apiKeyword, createdTestValues.apiKeywordUpdated]]
    );
    await pool.query('DELETE FROM rules WHERE target = $1', [createdTestValues.domainTarget]);
    await pool.query(
      'DELETE FROM rules WHERE target = ANY($1::text[])',
      [[createdTestValues.apiRuleTarget, createdTestValues.apiRuleTargetUpdated]]
    );
    await pool.query(
      'DELETE FROM blocked_extensions WHERE extension = ANY($1::text[])',
      [[createdTestValues.apiExtension, createdTestValues.apiExtensionUpdated]]
    );
    await pool.end();
    await servicePool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

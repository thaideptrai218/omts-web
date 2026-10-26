import "server-only";

// One key, bounded work. PXAT requires Redis >= 6.2. No script decodes untrusted JSON.
// TIME checks the Redis clock as well as the caller-side lifetime check.
const checkExpiry = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
if tonumber(ARGV[2]) <= now then return 'expired' end
`;

export const createSessionScript = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 'exists' end
${checkExpiry}
local written = redis.call('SET', KEYS[1], ARGV[1], 'PXAT', ARGV[2], 'NX')
if not written then return 'exists' end
return 'stored'
`;

// Compare the exact snapshot validated by TypeScript, not only a revision extracted in Lua.
export const replaceSessionScript = `
local current = redis.call('GET', KEYS[1])
if not current then return 'missing' end
if current ~= ARGV[3] then return 'changed' end
${checkExpiry}
local written = redis.call('SET', KEYS[1], ARGV[1], 'PXAT', ARGV[2], 'XX')
if not written then return 'missing' end
return 'stored'
`;

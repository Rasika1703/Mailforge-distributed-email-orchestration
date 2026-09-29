import { redis } from '../config/redis';

const HOUR_MS = 60 * 60 * 1000;
const SEND_SLOT_SCRIPT = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
local gap = tonumber(ARGV[1])
local held = ARGV[2] == '1'
local last = tonumber(redis.call('GET', KEYS[2]) or '0')
if held and now - last >= gap then
  redis.call('SET', KEYS[2], now, 'PX', gap + 60000)
  return 0
end
local nextFree = tonumber(redis.call('GET', KEYS[1]) or '0')
local slot = math.max(now, nextFree, last + gap)
redis.call('SET', KEYS[1], slot + gap, 'PX', (slot - now) + gap + 60000)
if slot == now then
  redis.call('SET', KEYS[2], now, 'PX', gap + 60000)
end
return slot - now
`;

export function delayKey(senderId: string): string {
  return `email-delay:${senderId}`;
}

export function lastSendKey(senderId: string): string {
  return `email-last-send:${senderId}`;
}

// `heldSlot` is true when the caller is a job that already waited for a slot.
export async function acquireSendSlot(senderId: string, minDelayMs: number, heldSlot: boolean): Promise<number> {
  const waitMs = await redis.eval(
    SEND_SLOT_SCRIPT,
    2,
    delayKey(senderId),
    lastSendKey(senderId),
    minDelayMs,
    heldSlot ? '1' : '0',
  );
  return Number(waitMs);
}


const HOURLY_RESERVE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
if count > tonumber(ARGV[2]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return count
`;

export function hourWindow(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / HOUR_MS);
}

export function rateKey(senderId: string, window: number): string {
  return `email-rate:${senderId}:${window}`;
}

export function nextWindowStartMs(nowMs: number = Date.now()): number {
  return (hourWindow(nowMs) + 1) * HOUR_MS;
}

export interface HourlyReservation {
  allowed: boolean;
  window: number;
  nextWindowStart: number;
}

export async function reserveHourlySlot(
  senderId: string,
  maxPerHour: number,
  nowMs: number = Date.now(),
): Promise<HourlyReservation> {
  const window = hourWindow(nowMs);
  // Key TTL is 2 hours so the counter safely outlives its own window.
  const result = await redis.eval(
    HOURLY_RESERVE_SCRIPT,
    1,
    rateKey(senderId, window),
    2 * 3600,
    maxPerHour,
  );
  return { allowed: Number(result) > 0, window, nextWindowStart: nextWindowStartMs(nowMs) };
}


export function rescheduleTimeForRateLimited(nowMs: number = Date.now()): number {
  return nextWindowStartMs(nowMs);
}

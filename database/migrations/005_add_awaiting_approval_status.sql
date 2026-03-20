-- Migration 005: Re-add awaiting_approval to work_order_status enum
-- This value was removed in migration 001 but is required for the client
-- approval flow (quote sent → awaiting client approval → in_progress).
--
-- PostgreSQL allows adding enum values without recreating the type.
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block,
-- so this statement runs outside one intentionally.

ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'awaiting_approval' AFTER 'diagnosing';

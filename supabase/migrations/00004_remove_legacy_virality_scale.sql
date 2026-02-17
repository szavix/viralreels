-- Migration: remove legacy virality scale (0..1) and standardize to 0..100

-- Convert legacy scores to new scale.
UPDATE reels
SET viral_score = viral_score * 100
WHERE viral_score >= 0 AND viral_score <= 1;

-- Guardrails to keep data in expected range.
UPDATE reels
SET viral_score = 0
WHERE viral_score < 0;

UPDATE reels
SET viral_score = 100
WHERE viral_score > 100;

# lib/ai

AI feedback for learners (SPEC §7), behind one adapter. Off by default: it runs only when
`AI_ENABLED=true` and `ANTHROPIC_API_KEY` is set. Every caller must have a rules-only fallback,
because `askAi` returns `null` whenever the service is off, slow, refuses or fails.

- `AI_MODEL` picks the model (default `claude-opus-5-5`).
- Learner text is sent without names or ids.

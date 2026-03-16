Default stance: assume you're allowed to refactor for clarity/root-cause fixes. Only optimize for minimal diffs when explicitly asked. Keep scope proportional to confidence, risk, and ownership.

Before editing, briefly state: goal, invariants to preserve, boundaries/ownership affected, key data flow, and what becomes simpler in the resulting code. Then explicitly name the shortcut solution you are not taking and give one sentence for why you are rejecting it. If making a structural change, also state which boundary or dependency becomes cleaner and what the main risk is. Prefer the structural fix that makes the code easiest to understand in isolation and removes the root cause — even if it touches more code.

During implementation: make behavior explicit; keep dependencies intentional and one-way; avoid reach-through/cycles; prefer deleting/merging/replacing over layering wrappers, flags, or special cases; add abstractions only if they remove real complexity and are understandable in isolation without needing to read callers.

Before creating something new, check whether the concept already exists under another name. Reuse or extend it when that improves clarity; if extension would force branching on the new case, keep it separate and note the overlap.

Priority order: correctness > local comprehensibility > architecture/root-cause > performance > speed. Follow project patterns only when they help clarity.

Do not shape production code solely for tests. When behavior or boundaries are unclear, treat tests as guardrails/spec; update or add them after changes, and keep the tree green.

After editing, confirm the simplification happened and update docs/comments if needed. Inspect changed files carefully and proceed by default; only pause if there is concrete risk of overwriting user intent or making an unsafe/destructive change.
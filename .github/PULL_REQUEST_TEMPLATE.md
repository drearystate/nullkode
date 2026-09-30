## What changed and why

<!-- One concern per pull request. Say what changed and why. Link the issue if there is one. -->

## Screenshots

<!-- For anything people see: before and after. Delete this section if nothing visible changed. -->

## Checks

- [ ] `pnpm typecheck` passes.
- [ ] If you added or changed a feature or template: `pnpm check:extensions` passes.
- [ ] If a generated browser script changed: `pnpm check:js` passes.
- [ ] Words people see name no AI provider or model maker (no "Claude", "Anthropic" or similar). Say "AI" or "the assistant".
- [ ] No decorative emoji in the interface. Icons that do a job are fine.
- [ ] Wording is plain and friendly for people who aren't technical.
- [ ] New code that creates pages calls `syncProjectNav`, so the app's menus stay in step.
- [ ] Nothing trusts `X-Forwarded-For`; the visitor's address comes from `X-Real-IP`.
- [ ] Scripts that change existing data only report by default and need `--apply` to write.
- [ ] Documentation is updated (README, docs/) if behaviour or setup changed.
- [ ] Tests: which ones you ran (for example `pnpm test:e2e`, or a single `scripts/e2e-*.ts`), and anything you couldn't test.

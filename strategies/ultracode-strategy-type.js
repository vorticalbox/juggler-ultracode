// SPDX-License-Identifier: Apache-2.0

import StrategyType, { APPROVAL_POLICY } from 'juggler/strategy-type';
import { INTERACTION_KIND } from 'juggler/context-item';
import { markUntranslated } from 'juggler/i18n';

/**
 * Ultracode — Juggler's take on Claude Code's "ultracode": the model works as
 * an orchestrator, fanning investigation out to parallel sub-agents and having
 * every change checked by an independent verifier before calling it done.
 *
 * Approvals behave like YOLO: every tool call (writes and shell commands
 * included) is auto-approved so a long run never stops to ask. Two things still
 * reach the human, exactly as under YOLO: elicitations (AskUserQuestion — the
 * answer is the user's own input) and calls the action marks non-auto-approvable
 * (e.g. a recursive delete of the project root or home).
 *
 * Fan-out is bounded by the host, not by this file: read-only sub-agents
 * (Explore, Research, Verify) run side by side, a delegated thread cannot itself
 * delegate, and the model stays the only agent that edits.
 * @augments StrategyType
 */
export default class UltracodeStrategyType extends StrategyType {
  static MANIFEST = {
    id: 'ultracode',
    name: 'Ultracode',
    version: '0.1.0',
    description: 'Orchestrates parallel sub-agents and verifies every change — slower and costlier, for work that must be right',
    author: 'vorticalbox',
    color: 'var(--accent-blue)',
    icon: 'icon-auto-awesome',
    order: 4,
    // Like YOLO: everything is auto-approved, so the toggles would do nothing.
    showsApprovalControls: false,
    defaultRules: [],
    recommendations: {
      recommendedFor: [
        'Large or cross-cutting changes',
        'Unfamiliar codebases',
        'Bugs that have already resisted a first attempt',
        'Work where a wrong answer is expensive'
      ],
      exampleTriggers: [
        'do this properly...',
        'audit and fix...',
        'migrate all of...'
      ],
      approach: 'Plans first, fans investigation out to parallel Explore/Research sub-agents, implements in small steps, then has independent Verify sub-agents check the result before reporting.',
      tradeoffs: {
        pros: [
          'Every tool call is auto-approved like YOLO, so it runs unattended',
          'Broad investigation without filling the main context',
          'Every change is checked by an agent that did not write it'
        ],
        cons: [
          'No approval checkpoint: writes and shell commands run without asking (as YOLO)',
          'Many more tokens and wall-clock time than Default',
          'Sub-agents only read — edits still happen one at a time in the main thread'
        ]
      }
    }
  };

  static GUIDANCE = markUntranslated(
    'ULTRACODE MODE: the user wants the most thorough, highest-quality result for this task '
    + 'and accepts the extra time and tokens. Work as an orchestrator:\n'
    + '1. Plan first. Break the task into independent questions and steps before changing anything.\n'
    + '2. Fan out. Put independent Explore (code) and Research (web) calls in the SAME turn so they run in '
    + 'parallel — one focused question each, with a self-contained brief naming files and symbols. Keep your '
    + 'own context for decisions; let sub-agents do the bulk reading.\n'
    + '3. Implement yourself, in small steps. Sub-agents cannot edit; you are the only writer.\n'
    + '4. Verify independently. After each meaningful change, call Verify — several in one turn for different '
    + 'angles (correctness, edge cases, tests/callers). Hand it the files, the change and the requirement, NOT '
    + 'your conclusion, so it is not anchored on your reading. Treat every issue it reports as real until you '
    + 'have disproved it.\n'
    + '5. Run the project\'s build and tests before you finish. Do not report done while anything is unverified; '
    + 'say plainly what failed, what you skipped, and why.'
  );

  /**
   * Same policy as YOLO: approve everything except elicitations and calls the
   * action marks as a deliberate human checkpoint.
   * @override
   * @param {{interactionKind?: string, autoApprovable?: boolean}} info
   * @returns {'approve'|'require-approval'|'default'} Policy decision
   */
  getApprovalPolicy({ interactionKind, autoApprovable }) {
    if (interactionKind === INTERACTION_KIND.ELICITATION) return APPROVAL_POLICY.DEFAULT;
    if (autoApprovable === false) return APPROVAL_POLICY.DEFAULT;
    return APPROVAL_POLICY.APPROVE;
  }
}

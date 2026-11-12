// SPDX-License-Identifier: Apache-2.0

import StrategyType from 'juggler/strategy-type';
import { markUntranslated } from 'juggler/i18n';

/**
 * Ultracode — Juggler's take on Claude Code's "ultracode": the model works as
 * an orchestrator, fanning investigation out to parallel sub-agents and having
 * every change checked by an independent verifier before calling it done.
 *
 * It is a pure steering strategy. Tools and approvals behave exactly as under
 * Default (writes and shell commands still ask, and the permission toggles stay
 * visible so the user can loosen them). What changes is the brief the model is
 * handed when the mode switches on.
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
    showsApprovalControls: true,
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
          'Broad investigation without filling the main context',
          'Every change is checked by an agent that did not write it'
        ],
        cons: [
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
}

// SPDX-License-Identifier: Apache-2.0

import StrategyType, { APPROVAL_POLICY } from 'juggler/strategy-type';
import { INTERACTION_KIND } from 'juggler/context-item';
import { markUntranslated } from 'juggler/i18n';

/**
 * Tools a sub-agent must never hold. `AskUserQuestion` blocks on a person who
 * is not in a delegated thread (and as an elicitation can be neither approved
 * nor refused); the rest steer the caller's session. Mirrors core's
 * SubagentStrategyType.WITHHELD.
 * @type {readonly string[]}
 */
const WITHHELD = Object.freeze([
  'AskUserQuestion', 'todo', 'plan', 'memory', 'define_command', 'new_conversation'
]);

/** Network tools: verification is about this checkout, not the web. */
const NETWORK_TOOLS = Object.freeze(['WebSearch', 'WebFetch', 'exa_search']);

const VERIFY_GUIDANCE = markUntranslated(
  'VERIFY SUB-AGENT: you are an independent reviewer checking one claim about this codebase, in a '
  + 'context of your own. Only your last message reaches the caller, so it has to stand alone.\n\n'
  + 'Working rules:\n'
  + '- Be adversarial. Your job is to find what is wrong, missing or untested — not to agree. Read the '
  + 'code yourself; do not trust the description of it.\n'
  + '- Ground every finding in a file and line you actually read, with a concrete input or state that '
  + 'breaks it.\n'
  + '- You have the read tools and `bash` for inspection and running checks (tests, type checks, '
  + '`git diff`). You cannot edit anything and have no network.\n'
  + '- Nobody is watching this thread: a call that would need approval is refused automatically, so '
  + 'stay within what needs none and say what you could not run.\n'
  + '- If you find nothing wrong, say so plainly and list what you checked.'
);

/**
 * The hidden strategy a Verify run works under: reads plus `bash`, no network,
 * no writes, and nothing left parked.
 *
 * The no-hang invariant: a delegated thread has no human, and APPROVAL_POLICY
 * has no DENY, so every surviving tool is either auto-approved here or refused
 * in onToolPending — never left waiting.
 * @augments StrategyType
 */
export default class VerifySubagentStrategyType extends StrategyType {
  static MANIFEST = {
    id: 'ultracode-verify',
    name: 'Verify (sub-agent)',
    version: '0.1.0',
    description: 'Read-only adversarial review for a delegated Verify run — no network, no edits.',
    author: 'vorticalbox',
    hidden: true,
    showsApprovalControls: false
  };

  static GUIDANCE = VERIFY_GUIDANCE;

  /**
   * @override
   * @param {import('juggler/strategy-type').ToolDefinition[]} tools - All available tools
   * @returns {import('juggler/strategy-type').ToolDefinition[]} Read/meta tools plus bash
   */
  filterTools(tools) {
    return tools.filter(t =>
      !WITHHELD.includes(t.name)
      && !t.requiresDelegation
      && !NETWORK_TOOLS.includes(t.name)
      && (t.name === 'bash' || t.category === 'read' || t.category === 'meta'));
  }

  /**
   * Approve what the permission system already allows; anything it would have
   * asked a human about parks for the instant onToolPending takes to refuse it.
   * @override
   * @param {{toolName: string, defaultApproval: boolean, interactionKind: string, autoApprovable?: boolean}} info - Approval context
   * @returns {'approve'|'require-approval'|'default'} Approval policy
   */
  getApprovalPolicy({ defaultApproval, interactionKind, autoApprovable }) {
    if (interactionKind === INTERACTION_KIND.ELICITATION) return APPROVAL_POLICY.DEFAULT;
    if (autoApprovable === false) return APPROVAL_POLICY.DEFAULT;
    return defaultApproval ? APPROVAL_POLICY.DEFAULT : APPROVAL_POLICY.APPROVE;
  }

  /**
   * Refuse anything that parked, as a failed tool the agent can work around
   * (refuseApproval) rather than a human denial that would end its run.
   * @override
   * @param {{toolUseId: string, toolName: string}} info - The parked call
   * @returns {void}
   */
  onToolPending({ toolUseId, toolName }) {
    this.messageThread.refuseApproval(toolUseId,
      `Refused: ${toolName} needed approval, and a sub-agent has nobody to ask. `
      + 'Find another way, or report what you could not check.');
  }
}

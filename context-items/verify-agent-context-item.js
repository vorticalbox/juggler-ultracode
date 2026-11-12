// SPDX-License-Identifier: Apache-2.0

import ContextItem from 'juggler/context-item';
import { hasStrategy } from 'juggler/registry';
import { translator, markUntranslated } from 'juggler/i18n';
import VerifySubagentStrategyType from './verify/verify-strategy.js';

const t = translator('@vorticalbox/ultracode');

const RESULT_SPEC = markUntranslated(
  'a verdict (CONFIRMED / ISSUES FOUND / COULD NOT VERIFY); each issue as `file:line — what is wrong — '
  + 'the input or state that breaks it`, most severe first; and what you checked, including any command '
  + 'you ran and its outcome. Say what you could not check rather than guessing.'
);

/**
 * `Verify` — an independent, read-only reviewer run as a delegated sub-agent.
 *
 * The caller hands it a claim ("this change makes X correct") plus the files;
 * the child reads and runs checks under VerifySubagentStrategyType and only its
 * verdict comes back. Read-only, so several Verify calls in one turn run side
 * by side — one per angle.
 *
 * Modelled on core's SubagentContextItem, which extensions cannot import.
 * @augments ContextItem
 */
export default class VerifyAgentContextItem extends ContextItem {
  static MANIFEST = {
    id: 'ultracode-verify-agent',
    name: 'Verify',
    version: '0.1.0',
    description: 'Independently check a change or claim in a read-only sub-agent',
    author: 'vorticalbox',
    requiresApproval: false,
    delegatesToSubthread: true,
    requiresDelegation: true,
    readOnlySubthread: true
  };

  /** @returns {{color: string, icon?: string}} Badge options */
  static getBadgeOptions() {
    return { color: 'thread', icon: 'icon-checklist' };
  }

  /** @returns {Array<typeof import('juggler/strategy-type').default>} The owned hidden strategy */
  static getStrategies() {
    return [VerifySubagentStrategyType];
  }

  static getToolDefinitions() {
    return [{
      name: 'Verify',
      category: 'read',
      description: markUntranslated(
        'Have an independent read-only sub-agent check a change or claim against the code, and get back only '
        + 'its verdict and evidence. It can read files and run inspection commands (tests, type checks, git diff) '
        + 'but cannot edit or use the network. Use it after a change and before reporting done; call it several '
        + 'times in one turn for different angles (correctness, edge cases, callers, tests) — they run in parallel. '
        + 'Give it the requirement, the files and the change, not your conclusion.\n'
        + 'The task must be self-contained: the sub-agent sees nothing of this conversation.'),
      input_schema: {
        type: 'object',
        properties: {
          goal: {
            type: 'string',
            description: markUntranslated('Very short, single-line, user-facing label (for example, "Check null handling"). Not the task.')
          },
          task: {
            type: 'string',
            description: markUntranslated('What to verify, stated in full: the requirement, the files and symbols changed, '
              + 'and the angle to check. Do not include your own verdict.')
          },
          session: {
            type: 'string',
            description: markUntranslated('Optional Verify session name from an earlier call — continues that same review; omit it to start fresh.')
          }
        },
        required: ['goal', 'task']
      }
    }];
  }

  /**
   * @override
   * @param {Record<string, unknown>} toolInput - Raw parameters from the model
   * @returns {Promise<import('juggler/context-item').ValidationResult>} Validation result
   */
  async validate(toolInput) {
    for (const key of ['goal', 'task']) {
      const value = toolInput[key];
      if (typeof value !== 'string' || !value.trim()) {
        return { valid: false, error: `Missing required parameter: ${key}` };
      }
    }
    return { valid: true, params: toolInput };
  }

  /**
   * @override
   * @param {Record<string, unknown>} toolInput - Validated tool input
   * @returns {import('juggler/context-item').SubthreadSpec} The child's seed
   */
  buildSubthreadSpec(toolInput) {
    const strategyId = VerifySubagentStrategyType.MANIFEST.id;
    /** @type {import('juggler/context-item').SubthreadSpec} */
    const spec = {
      goal: String(toolInput.goal).trim(),
      prompt: `Independently verify the following against this codebase.\n\n# Task\n${String(toolInput.task).trim()}`,
      resultSpec: RESULT_SPEC,
      sessionName: toolInput.session ? String(toolInput.session).trim() : undefined
    };
    if (hasStrategy(strategyId)) {
      spec.strategyId = strategyId;
    } else {
      console.error(`[ultracode] strategy "${strategyId}" is not registered; Verify will run under the caller's strategy, unfiltered.`);
    }
    return spec;
  }

  /**
   * Reached only if delegation failed; there is no inline Verify.
   * @override
   * @returns {Promise<Record<string, unknown>>} Never resolves
   * @throws {Error} Always
   */
  async execute() {
    throw new Error(markUntranslated("Verify couldn't start a sub-agent, so nothing was checked. Review the change yourself with read, grep and the project's tests."));
  }

  /**
   * @override
   * @param {any} actionStatus - Action execution status
   * @param {Record<string, unknown>} toolInput - Original tool input
   * @returns {import('juggler/context-item').ResultStatusMessage|null} Status message config
   */
  getStatusUI(actionStatus, toolInput) {
    const goal = String(toolInput?.goal || '');
    return this.buildStatusUI(actionStatus, {
      typeName: t('Verify'),
      pending: goal || t('Verifying…'),
      success: () => goal || t('Verified'),
      failurePrefix: t('Verify')
    });
  }

  /**
   * @override
   * @param {HTMLElement} wrapper - Details container
   * @param {import('juggler/context-item').ToolActionRenderContext} ctx - Render context
   * @returns {void}
   */
  renderToolActionDetails(wrapper, ctx) {
    const { input, helpers } = ctx;
    if (input.task) helpers.addSubsection(wrapper, t('Task'), String(input.task), 'properties-panel-code');
  }
}

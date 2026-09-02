import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { aiRegistry } from './ai/provider.js';

type BrainDecision = 'retry' | 'resume' | 'pause';

const BrainState = Annotation.Root({
  objective: Annotation<string>,
  progress: Annotation<string>,
  error: Annotation<string>,
  decision: Annotation<string>,
  reason: Annotation<string>,
});

const brainGraph = new StateGraph(BrainState)
  .addNode('assess', async (state) => {
    const prompt = `You are JARVIS recovery brain. Decide the safest next action for a long-running document task.\nObjective: ${state.objective}\nProgress: ${state.progress}\nError: ${state.error}\n\nReturn ONLY JSON: {"decision":"retry|resume|pause","reason":"short reason"}.\nRules: transient/network/stream/provider failures => retry; checkpointed partial progress => resume; validation/source-integrity failures that require human correction => pause. Never invent missing source content.`;
    try {
      const provider = aiRegistry.getProvider('gemini');
      const raw = await provider.generateText(prompt, {
        model: 'gemini-3.7-flash',
        responseMimeType: 'application/json',
      });
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
      const decision: BrainDecision = parsed?.decision === 'resume' || parsed?.decision === 'pause' ? parsed.decision : 'retry';
      return { decision, reason: String(parsed?.reason || 'Transient failure; retrying the current checkpoint.') };
    } catch {
      const transient = /timeout|timed out|network|stream|channel|502|503|504|fetch|socket|temporar|rate limit|429/i.test(state.error);
      return {
        decision: transient ? 'retry' : 'pause',
        reason: transient ? 'Failure looks transient; retry the current checkpoint.' : 'Failure may affect source integrity; pause instead of guessing.',
      };
    }
  })
  .addEdge(START, 'assess')
  .addEdge('assess', END)
  .compile();

export async function jarvisRecoveryDecision(input: {
  objective: string;
  progress: string;
  error: string;
}): Promise<{ decision: BrainDecision; reason: string }> {
  const result = await brainGraph.invoke({ ...input, decision: '', reason: '' });
  return {
    decision: (result.decision === 'resume' || result.decision === 'pause' ? result.decision : 'retry') as BrainDecision,
    reason: result.reason || 'Transient failure; retry the current checkpoint.',
  };
}

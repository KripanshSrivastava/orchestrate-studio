import { getAllExecutionRuns } from './backend/services/workflow/workflowExecutionService.js';

async function test() {
  try {
    const runs = await getAllExecutionRuns();
    console.log("Success:", runs);
  } catch (e) {
    console.error("DB Error:", e);
  }
}
test();

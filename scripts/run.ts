import { main } from '../src/cli/orchestrator';
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

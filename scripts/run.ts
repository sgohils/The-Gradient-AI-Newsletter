import { main } from '../src/cli/orchestrator';
main().then(() => {
  process.exit(process.exitCode || 0);
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

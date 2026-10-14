import * as fs from 'fs';
import { argument } from '../src/video/cli';
import { parsePerformanceCsv, performanceReport } from '../src/video/performance';

try {
  const report = performanceReport(parsePerformanceCsv(fs.readFileSync(argument('--input', true)!, 'utf8')));
  const output = argument('--output');
  if (output) fs.writeFileSync(output, report, 'utf8');
  else console.log(report);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Performance review failed.');
  process.exitCode = 1;
}

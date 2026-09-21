// SPFx 1.18 only runs on Node 16/18, but nvm on this machine keeps getting
// switched to newer majors by other tooling. Failing fast with the fix beats
// the stack trace sp-build-web throws.
const major = parseInt(process.versions.node.split('.')[0], 10);
if (major !== 16 && major !== 18) {
  console.error('');
  console.error('This project needs Node 18 (you are on v' + process.versions.node + ').');
  console.error('Fix:  nvm use 18.18.2   then rerun the command.');
  console.error('');
  process.exit(1);
}

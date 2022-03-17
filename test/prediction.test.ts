import { BSC_CONFIG, PredictionService } from '../src';
import fs from 'fs';

async function main() {
  const filePath = './test/prediction.test.csv';
  fs.existsSync(filePath) ? fs.unlinkSync(filePath) : null;
  fs.appendFileSync(filePath, ['timestamp', 'sender', 'epoch', 'amount'].join(',') + '\n');
  await new PredictionService(BSC_CONFIG).addClaimEventListener((claimEvent) => {
    console.log(JSON.stringify(claimEvent));
    fs.appendFileSync(filePath, [claimEvent.timestamp, claimEvent.sender, claimEvent.epoch, claimEvent.amount].join(',') + '\n');
  });
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}

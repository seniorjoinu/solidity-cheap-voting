import {
  _evmIncreaseTime,
  assertTxThrows,
  createWallets, delay, EtherUnit,
  initialDeployment, ONE_DAY, parseVoting,
  THIRTY_DAYS
} from './utils';
import {assert} from 'chai';
import {formatEther, parseEther, parseUnits} from 'ethers/lib/utils';
import {BigNumber} from 'ethers';


enum VoteStatus {
  NONE, ACCEPT, REJECT
}

enum VotingResult {
  NONE, ACCEPT, REJECT, NOT_APPLIED
}

describe('Voting', () => {
  it('voting can be executed by a single person with enough share', async () => {
    const [party1, party2] = await createWallets();
    const {voting, token} = await initialDeployment(party1);
    const votingPar1 = voting.connect(party1);
    const votingPar2 = voting.connect(party2);

    const rec1 = await token.mint(party1.address, {value: parseEther('100')}).then(it => it.wait());
    console.log(`Mint gas cost: ${formatEther(rec1.gasUsed.mul(parseUnits('100', EtherUnit.GWEI)))} ETH`);

    const rec2 = await votingPar1.startVoting(ONE_DAY, 'Simple common voting').then(it => it.wait());
    console.log(`Start voting gas cost: ${formatEther(rec2.gasUsed.mul(parseUnits('100', EtherUnit.GWEI)))} ETH`);
    const voting0 = parseVoting(BigNumber.from(0), await votingPar1.getVoting(0));

    assert(voting0.totalAccepted.eq(0), 'There should not be any total accepted vote');
    assert(voting0.totalRejected.eq(0), 'There should not be any total rejected vote');
    assert(!voting0.executed, 'The voting should be in executed state');
    assert(voting0.description == 'Simple common voting', 'The description should be the same');
    console.log(voting0.duration, ONE_DAY);
    assert(voting0.duration == ONE_DAY, 'Voting duration is invalid');

    const rec3 = await votingPar1.vote(0, VoteStatus.ACCEPT).then(it => it.wait());
    console.log(`Vote gas cost: ${formatEther(rec3.gasUsed.mul(parseUnits('100', EtherUnit.GWEI)))} ETH`);

    await _evmIncreaseTime(ONE_DAY);
    await assertTxThrows(() => votingPar2.vote(0, VoteStatus.ACCEPT), 'Too late to vote');

    const rec4 = await votingPar1.executeVoting(0).then(it => it.wait());
    console.log(`Execute voting gas cost: ${formatEther(rec4.gasUsed.mul(parseUnits('100', EtherUnit.GWEI)))} ETH`);
    await assertTxThrows(() => votingPar1.executeVoting(0), 'Voting already executed');

    const voting01 = parseVoting(BigNumber.from(0), await votingPar1.getVoting(0));
    console.log(voting01);

    assert(voting01.totalAccepted.eq(parseEther('100')), 'There should be exact 100 total accepted vote');
    assert(voting01.totalRejected.eq(0), 'There should not be any total rejected vote');
    assert(voting01.executed, 'The voting should be in executed state');

    await delay(2000);
  });

  it('upgrade votings work as expected', async () => {
    const [party1, party2, party3, party4, party5, party6, party7, party8, party9, party10] = await createWallets();
    const {token, voting} = await initialDeployment(party1);
    const votingPar1 = voting.connect(party1);
    const votingPar2 = voting.connect(party2);
    const votingPar3 = voting.connect(party3);
    const votingPar4 = voting.connect(party4);

    await token.mint(party1.address, {value: parseEther('3000')}).then(it => it.wait());
    await token.mint(party2.address, {value: parseEther('2000')}).then(it => it.wait());
    await token.mint(party3.address, {value: parseEther('1000')}).then(it => it.wait());
    await token.mint(party4.address, {value: parseEther('500')}).then(it => it.wait());
    await token.mint(party5.address, {value: parseEther('500')}).then(it => it.wait());
    await token.mint(party6.address, {value: parseEther('500')}).then(it => it.wait());
    await token.mint(party7.address, {value: parseEther('500')}).then(it => it.wait());
    await token.mint(party8.address, {value: parseEther('500')}).then(it => it.wait());
    await token.mint(party9.address, {value: parseEther('500')}).then(it => it.wait());
    await token.mint(party10.address, {value: parseEther('1000')}).then(it => it.wait());

    // voting that should not apply because weight of 1000 < 20% of MAX_MINTED
    await voting.startVoting(THIRTY_DAYS, 'We\'re going to fail this guys :c').then(it => it.wait());

    await votingPar3.vote(0, VoteStatus.ACCEPT).then(it => it.wait());

    const voting0 = parseVoting(BigNumber.from(0), await votingPar1.getVoting(0));
    console.log(voting0);

    await _evmIncreaseTime(THIRTY_DAYS);
    await assertTxThrows(() => votingPar2.vote(0, VoteStatus.ACCEPT), 'Too late to vote');

    const rec = await votingPar1.executeVoting(0).then(it => it.wait());
    assert((rec.events![0].args as any).result == VotingResult.NOT_APPLIED, 'Voting should not apply');

    // voting that should reject because it's a tie
    await votingPar1.startVoting(THIRTY_DAYS, 'Reject it!').then(it => it.wait());

    await votingPar1.vote(1, VoteStatus.ACCEPT).then(it => it.wait());
    await votingPar2.vote(1, VoteStatus.REJECT).then(it => it.wait());
    await votingPar3.vote(1, VoteStatus.REJECT).then(it => it.wait());

    await _evmIncreaseTime(THIRTY_DAYS);

    await votingPar1.executeVoting(1).then(it => it.wait());

    const voting1 = parseVoting(BigNumber.from(1), await voting.getVoting(1));
    console.log(voting1);
    assert(voting1.totalAccepted.eq(parseEther('3000')), 'There should be exact 3000 total accepted votes');
    assert(voting1.totalRejected.eq(parseEther('3000')), 'There should be exact 3000 total rejected votes');

    // real voting that should succeed and migrate casino
    await votingPar1.startVoting(THIRTY_DAYS, 'This should pass, guys')
      .then(it => it.wait());

    await votingPar1.vote(2, VoteStatus.ACCEPT).then(it => it.wait());
    await votingPar2.vote(2, VoteStatus.ACCEPT).then(it => it.wait());
    await votingPar3.vote(2, VoteStatus.ACCEPT).then(it => it.wait());
    await votingPar4.vote(2, VoteStatus.REJECT).then(it => it.wait());

    await _evmIncreaseTime(THIRTY_DAYS);

    await votingPar1.executeVoting(2).then(it => it.wait());

    const voting2 = parseVoting(BigNumber.from(2), await votingPar1.getVoting(2));
    assert(voting2.totalAccepted.eq(parseEther('6000')), 'There should be exact 6000 total accepted votes');
    assert(voting2.totalRejected.eq(parseEther('500')), 'There should be exact 500 total rejected vote');
    assert(voting2.executed, 'The voting should be executed');

    await delay(2000);
  });
});

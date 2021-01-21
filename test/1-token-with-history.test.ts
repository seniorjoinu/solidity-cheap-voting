import {createWallets, delay, ethTimestampNow, initialDeployment} from './utils';
import {assert} from 'chai';
import {formatEther, parseEther} from 'ethers/lib/utils';

/*
  It is critical to start this test first, because next tests are manipulating the evm's time
  And the evm should be clean (recently started) for the same reason
  So, it is skipped (xit) by default
 */
describe('ERC777 token with history', () => {
  xit('provides valid history', async () => {
    const [party0, party1] = await createWallets();
    const {token} = await initialDeployment(party0);
    const token0 = token;
    const token1 = token.connect(party1)

    await token0.mint(party0.address, {value: parseEther('2000')}).then(it => it.wait());

    const expNow1 = ethTimestampNow();
    await delay(1000);

    // 2000

    await token0.transfer(party1.address, parseEther('1')).then(it => it.wait());
    // 1999

    const expNow2 = ethTimestampNow();
    await delay(1000);

    await token0.transfer(party1.address, parseEther('1')).then(it => it.wait());
    // 1998

    const expNow3 = ethTimestampNow();
    await delay(1000);

    await token0.burn(parseEther('1'), '0x').then(it => it.wait());
    // 1997

    const expNow4 = ethTimestampNow();
    await delay(1000);

    await token1.transfer(party0.address, parseEther('1')).then(it => it.wait());
    // 1998

    const expNow5 = ethTimestampNow();
    await delay(1000);

    await token0.transfer(party1.address, parseEther('1998')).then(it => it.wait());
    // 0

    const expNow6 = ethTimestampNow();
    await delay(1000);

    await token1.transfer(party0.address, parseEther('1998')).then(it => it.wait());
    // 1998

    const expNow7 = ethTimestampNow();
    await delay(1000);

    await token0.mint(party0.address, {value: parseEther('2')}).then(it => it.wait());
    // 2000

    const expNow8 = ethTimestampNow();

    const expBalance1 = parseEther('2000');
    const expBalance2 = parseEther('1999');
    const expBalance3 = parseEther('1998');
    const expBalance4 = parseEther('1997');
    const expBalance5 = parseEther('1998');
    const expBalance6 = parseEther('0');
    const expBalance7 = parseEther('1998');
    const expBalance8 = parseEther('2000');

    const balance1 = await token0.balanceAt(party0.address, expNow1);
    const balance2 = await token0.balanceAt(party0.address, expNow2);
    const balance3 = await token0.balanceAt(party0.address, expNow3);
    const balance4 = await token0.balanceAt(party0.address, expNow4);
    const balance5 = await token0.balanceAt(party0.address, expNow5);
    const balance6 = await token0.balanceAt(party0.address, expNow6);
    const balance7 = await token0.balanceAt(party0.address, expNow7);
    const balance8 = await token0.balanceAt(party0.address, expNow8);

    console.log([expNow1, expNow2, expNow3, expNow4, expNow5, expNow6, expNow7, expNow8]);

    assert(expBalance1.eq(balance1), `Balance 1 is incorrect: exp: ${formatEther(expBalance1)}, act: ${formatEther(balance1)}`);
    assert(expBalance2.eq(balance2), `Balance 2 is incorrect: exp: ${formatEther(expBalance2)}, act: ${formatEther(balance2)}`);
    assert(expBalance3.eq(balance3), `Balance 3 is incorrect: exp: ${formatEther(expBalance3)}, act: ${formatEther(balance3)}`);
    assert(expBalance4.eq(balance4), `Balance 4 is incorrect: exp: ${formatEther(expBalance4)}, act: ${formatEther(balance4)}`);
    assert(expBalance5.eq(balance5), `Balance 5 is incorrect: exp: ${formatEther(expBalance5)}, act: ${formatEther(balance5)}`);
    assert(expBalance6.eq(balance6), `Balance 6 is incorrect: exp: ${formatEther(expBalance6)}, act: ${formatEther(balance6)}`);
    assert(expBalance7.eq(balance7), `Balance 7 is incorrect: exp: ${formatEther(expBalance7)}, act: ${formatEther(balance7)}`);
    assert(expBalance8.eq(balance8), `Balance 8 is incorrect: exp: ${formatEther(expBalance8)}, act: ${formatEther(balance8)}`);

    await token0.clearAccountHistory().then(it => it.wait());

    const balance11 = await token0.balanceAt(party0.address, expNow1);
    const balance21 = await token0.balanceAt(party0.address, expNow2);
    const balance31 = await token0.balanceAt(party0.address, expNow3);
    const balance41 = await token0.balanceAt(party0.address, expNow4);
    const balance51 = await token0.balanceAt(party0.address, expNow5);
    const balance61 = await token0.balanceAt(party0.address, expNow6);
    const balance71 = await token0.balanceAt(party0.address, expNow7);
    const balance81 = await token0.balanceAt(party0.address, expNow8);

    assert(balance11.eq(0), `Balance 11 is incorrect: exp: ${formatEther(0)}, act: ${formatEther(balance11)}`);
    assert(balance21.eq(0), `Balance 21 is incorrect: exp: ${formatEther(0)}, act: ${formatEther(balance21)}`);
    assert(balance31.eq(0), `Balance 31 is incorrect: exp: ${formatEther(0)}, act: ${formatEther(balance31)}`);
    assert(balance41.eq(0), `Balance 41 is incorrect: exp: ${formatEther(0)}, act: ${formatEther(balance41)}`);
    assert(balance51.eq(0), `Balance 51 is incorrect: exp: ${formatEther(0)}, act: ${formatEther(balance51)}`);
    assert(balance61.eq(0), `Balance 61 is incorrect: exp: ${formatEther(0)}, act: ${formatEther(balance61)}`);
    assert(balance71.eq(0), `Balance 71 is incorrect: exp: ${formatEther(0)}, act: ${formatEther(balance71)}`);
    assert(balance81.eq(expBalance8), `Balance 81 is incorrect: exp: ${formatEther(expBalance8)}, act: ${formatEther(balance81)}`);

    await delay(2000);
  });
});

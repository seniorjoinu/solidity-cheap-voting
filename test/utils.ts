import {HDKey} from 'wallet.ts';
import {mnemonicToSeed} from 'bip39';
import {BigNumber, BigNumberish, ContractReceipt, ContractTransaction, ethers, utils} from 'ethers';
import Web3 from 'web3';
import {
  Erc1820Registry,
  Erc1820RegistryFactory,
  MyToken, MyTokenFactory,
  Voting, VotingFactory
} from '../types/ethers-contracts';
import {assert} from 'chai';
// @ts-ignore
import {singletons} from '@openzeppelin/test-helpers';
import {formatEther, parseUnits} from 'ethers/lib/utils';
import fetch from 'node-fetch';

export enum EtherUnit {
  WEI = 'wei', // 10^0
  KWEI = 'kwei', // 10^3
  MWEI = 'mwei', // 10^6
  GWEI = 'gwei', // 10^9
  SZABO = 'szabo', // 10^12
  FINNEY = 'finney', // 10^15
  ETHER = 'ether' // 10^18
}

export const ETH_ENDPOINT = 'http://localhost:8545';

export async function createAdminWallets(): Promise<HDKey[]> {
  const seed = await mnemonicToSeed('zebra grant load arctic broken broom first timber peasant lizard purse ride');
  const masterKey = HDKey.parseMasterSeed(seed);

  const {extendedPrivateKey} = masterKey.derive('m/44\'/60\'/0\'/0');
  const childKey = HDKey.parseExtendedKey(extendedPrivateKey!);
  const wallets: HDKey[] = [];
  for (let i = 0; i < 10; i++) {
    const wallet = childKey.derive(`${i}`);
    wallets.push(wallet);
  }

  return wallets;
}

export async function createWallets(): Promise<ethers.Wallet[]> {
  const wallets = await createAdminWallets();
  // @ts-ignore
  const provider = new ethers.providers.Web3Provider(new Web3.providers.HttpProvider(ETH_ENDPOINT));

  return wallets.map(wallet => new ethers.Wallet(wallet.privateKey!, provider));
}

export async function initialDeployment(wallet: ethers.Wallet): Promise<IDeployment> {

  console.log('Initial deployment started');

  const reg = await singletons.ERC1820Registry(wallet.address);
  const erc1820registry = Erc1820RegistryFactory.connect(reg.options.address, wallet);

  const tokenFactory = new MyTokenFactory(wallet);
  const token = await tokenFactory.deploy(wallet.address).then(it => it.deployed());
  const rec1 = await token.deployTransaction.wait();

  const votingFactory = new VotingFactory(wallet);
  const voting = await votingFactory.deploy(token.address).then(it => it.deployed());
  const rec2 = await voting.deployTransaction.wait();

  const totalGasUsedEth = (rec1.gasUsed.add(rec2.gasUsed)).mul(parseUnits('100', EtherUnit.GWEI));
  console.log(`Initial deployment complete, ${formatEther(totalGasUsedEth)} ETH gas used (100 Gwei gas price)`);

  return {token, erc1820registry, voting};
}

export interface IDeployment {
  erc1820registry: Erc1820Registry;
  token: MyToken;
  voting: Voting;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function assertTxThrows(func: () => Promise<ContractTransaction>, message: string = '') {
  try {
    const tx = await func();
    await tx.wait();
    throw null;
  } catch (e) {
    if (e == null) {
      assert(false, `Tx did not threw: [${message}]`)
    }

    console.log(`Thrown as expected: [${message}] - ${e.reason || e.message}`);
  }
}

export function logAmount(num: BigNumberish, prefix: string = '', postfix: string = EtherUnit.ETHER) {
  console.log(prefix + ' ' + formatEther(num) + ' ' + postfix);
}

export async function _evmIncreaseTime(secs: number, endpoint: string = 'http://localhost:8545'): Promise<any> {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 1337,
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [secs]
    })
  });
}

export interface IVoting {
  id: BigNumber;
  createdAt: number;
  duration: number;
  description: string;
  totalAccepted: BigNumber;
  totalRejected: BigNumber;
  executed: boolean;
}

export function parseVoting(
  id: BigNumber,
  votingArr: {0: BigNumber, 1: BigNumber, 2: string, 3: boolean, 4: BigNumber, 5: BigNumber}
): IVoting {
  return {
    id,
    createdAt: votingArr[0].toNumber(),
    duration: votingArr[1].toNumber(),
    description: votingArr[2],
    executed: votingArr[3],
    totalAccepted: votingArr[4],
    totalRejected: votingArr[5]
  }
}

export function ethTimestampNow(): number {
  return Math.floor(new Date().getTime() / 1000);
}

export const ONE_DAY = 60 * 60 * 24 + 1;
export const THIRTY_DAYS = ONE_DAY * 30 + 1;
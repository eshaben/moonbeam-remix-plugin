import React, { useEffect } from 'react';
import { Container, Form, InputGroup, Tooltip, Button, OverlayTrigger } from 'react-bootstrap';
import copy from 'copy-to-clipboard';
import BN from 'bn.js';
import { NETWORKS, MoonbeamLib, networkName } from './moonbeam-signer';
import Compiler from './components/Compiler';
import SmartContracts from './components/SmartContracts';
import { InterfaceContract } from './components/Types';
import TxValue from './components/TxValue';

const supportedNetworks: string[] = ['Moonbase Alpha', 'Moonriver', 'Moonbeam'];

const App: React.FunctionComponent = () => {
	const [account, setAccount] = React.useState<string>('');
	const [balance, setBalance] = React.useState<string>('');
	const [network, setNetwork] = React.useState<string>('Moonbase Alpha');
	const [busy, setBusy] = React.useState<boolean>(false);
	const [moonbeamLib] = React.useState<MoonbeamLib>(new MoonbeamLib(NETWORKS['Moonbase Alpha']));
	const [connected, setConnected] = React.useState<boolean>(false);
	const [atAddress, setAtAddress] = React.useState<string>('');
	const [contracts, setContracts] = React.useState<InterfaceContract[]>([]);
	const [selected, setSelected] = React.useState<InterfaceContract | null>(null);
	const [txValue, setTxValue] = React.useState<BN>(new BN(0));
	const [isMoonbeam, setIsMoonbeam] = React.useState<boolean>(false);

	async function connect(selectedNetwork: string) {
		setBusy(true);
		const { networkId } = await moonbeamLib.connectMetaMask(
			(accounts: string[]) => {
				setAccount(accounts[0]);
				updateBalance(accounts[0]);
			},
			async (_networkId: number) => {
				await updateBalance(account);
				const name = networkName(_networkId);
				if (name === 'Not Moonbeam') {
					setNetwork(selectedNetwork);
				} else {
					setNetwork(name);
				}
			},
			selectedNetwork
		);
		setConnected(moonbeamLib.isConnected);
		setNetwork(networkName(networkId));
		setBusy(false);
	}

	async function updateBalance(address: string) {
		if (address && address !== '') {
			const readBalance = await moonbeamLib.getTotalBalance(address);
			setBalance(moonbeamLib.web3.utils.fromWei(readBalance.toString()));
		}
	}

	function addNewContract(contract: InterfaceContract) {
		setContracts(contracts.concat([contract]));
	}

	function isNetwork(text: string): string | undefined {
		if (supportedNetworks.includes(text)) {
			return text as string;
		}
		throw new Error('This is not a valid network');
	}

	function updateNetwork(name: string) {
		if (name === 'Not Moonbeam') {
			setIsMoonbeam(false);
			setNetwork('Moonbase Alpha'); // default to Moonbase
		} else {
			setIsMoonbeam(true);
			if (network !== name) {
				setNetwork(name);
			}
		}
	}

	useEffect(() => {
		async function updateAccount() {
			const provider: any = await moonbeamLib.getProvider();
			const accountsRead = await provider.request({ method: 'eth_accounts' });
			if (accountsRead.length > 0) {
				setConnected(true);
				setAccount(accountsRead[0]);
				updateBalance(accountsRead[0]);
			}

			const chainRead = await provider.request({ method: 'net_version' });
			const chainReadName = networkName(Number(chainRead));
			updateNetwork(chainReadName);

			if (provider && provider.isMetaMask) {
				provider.on('accountsChanged', () => {
					setAccount('');
					setBalance('');
					setConnected(false);
				});

				provider.on('chainChanged', (chainId: string) => {
					const name = networkName(Number(chainId));
					updateNetwork(name);
				});
			}
		}

		updateAccount();
	});

	function Networks() {
		return (
			<Form.Group>
				<Form.Text className="text-muted">
					<small>NETWORK</small>
				</Form.Text>
				<InputGroup.Append>
					<Form.Control
						as="select"
						size="lg"
						value={network}
						onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
							const selectedNetwork = isNetwork(event.target.value);
							if (selectedNetwork) connect(selectedNetwork);
						}}
					>
						{supportedNetworks.map((opt) => {
							return <option key={opt}>{opt}</option>;
						})}
					</Form.Control>
					<InputGroup.Append>
						<OverlayTrigger
							placement="bottom"
							overlay={
								<Tooltip id="overlay-connect" hidden={account !== ''}>
									Connect to Wallet
								</Tooltip>
							}
						>
							<Button variant="warning" block size="sm" disabled={busy} onClick={() => connect(network)}>
								<small>Connect</small>
							</Button>
						</OverlayTrigger>
					</InputGroup.Append>
				</InputGroup.Append>
			</Form.Group>
		);
	}

	return (
		<div className="App">
			<Container>
				<Form>
					<Form.Group>
						<Form.Text className="text-muted">
							<small>ACCOUNT</small>
						</Form.Text>
						<InputGroup>
							{account && network ? (
								<InputGroup.Append>
									<Button
										variant="link"
										size="sm"
										className="mt-0 pt-0 float-right"
										disabled={!account}
										onClick={() => {
											copy(account);
										}}
									>
										<i className="far fa-copy" />
									</Button>
								</InputGroup.Append>
							) : null}
							<Form.Control type="text" placeholder="Account" value={account} size="sm" readOnly />
						</InputGroup>
						<Networks />
						{connected ? (
							!isMoonbeam ? (
								<p className="text-center mt-3">
									<small style={{ color: 'red', padding: '1em' }}>Connect MetaMask to a Moonbeam Network</small>
								</p>
							) : (
								<p className="text-center mt-3">
									<small style={{ color: 'green' }}>Connected to {network}</small>
								</p>
							)
						) : (
							<p className="text-center mt-3">
								<small style={{ color: 'red' }}>Please Connect</small>
							</p>
						)}
					</Form.Group>
					<Form.Group>
						<Form.Text className="text-muted">
							<small>BALANCE (MOONBEAM)</small>
						</Form.Text>
						<InputGroup>
							<Form.Control type="text" placeholder="0.0" value={balance} size="sm" readOnly />
						</InputGroup>
					</Form.Group>
					{TxValue(setTxValue)}
				</Form>
				<hr />
				<Compiler
					moonbeamLib={moonbeamLib}
					// Analytics
					// gtag={(name: string) => {
					// 	const { gtag } = window as { [key: string]: any };
					// 	gtag('event', name, { network });
					// }}
					busy={busy}
					setBusy={setBusy}
					addNewContract={addNewContract}
					setSelected={setSelected}
					updateBalance={updateBalance}
					txValue={txValue}
				/>
				<p className="text-center mt-3">
					<small>OR</small>
				</p>
				<InputGroup className="mb-3">
					<Form.Control
						value={atAddress}
						placeholder="contract address"
						onChange={(e) => {
							setAtAddress(e.target.value);
						}}
						size="sm"
						disabled={busy || account === '' || !selected}
					/>
					<InputGroup.Append>
						<OverlayTrigger
							placement="left"
							overlay={<Tooltip id="overlay-ataddresss">Use deployed Contract address</Tooltip>}
						>
							<Button
								variant="primary"
								size="sm"
								disabled={busy || account === '' || !selected}
								onClick={() => {
									setBusy(true);
									if (selected) {
										addNewContract({ ...selected, address: atAddress });
									}
									setBusy(false);
								}}
							>
								<small>At Address</small>
							</Button>
						</OverlayTrigger>
					</InputGroup.Append>
				</InputGroup>
				<hr />
				<SmartContracts
					moonbeamLib={moonbeamLib}
					busy={busy}
					setBusy={setBusy}
					contracts={contracts}
					updateBalance={updateBalance}
					txValue={txValue}
				/>
			</Container>
		</div>
	);
};

export default App;


import Web3 from 'web3';
import { Web3BigNumber } from 'web3-bignumber';
import { Web3errors } from 'web3-errors-extract';
import { getChainById } from './helper/chainsRpc';
import { addSwitchNetworkEventListener, modal, selectedLevel, toggleChainErrorShow, setConnectWallet, setContractBalance, setNetworkIdText, setTopLevel, setWalletMessage, setWalletSwitchButton, topLevel } from './main';

BigInt.prototype.toJSON = function () {
    return this.toString();
};

const wallet_switchEthereumChain = async (network) => {
    const chain = getChainById(network);
    if (!chain) {
        throw new Error(`Unsupported chain id: ${network}`);
    }
    modal.switchNetwork(chain);
}

const handleClick = async (event, isCallFnc, isPayable) => {
    const button = event.target;
    console.log(button)

    const { contract, walletContract, web3Errors, address } = topLevel;
    const children = [...button.parentNode.children];
    const displaySpan = children[children.length - 1];

    if (!contract) {
        displaySpan.innerText = "Error: Contract not initialized.";
        displaySpan.style.color = "red";
        displaySpan.style.fontWeight = "bold";
        return;
    }
    if (!isCallFnc && !address) {
        displaySpan.innerText = "Error: Connect wallet before sending transactions.";
        displaySpan.style.color = "red";
        displaySpan.style.fontWeight = "bold";
        return;
    }
    const inputs = children.filter(element => element.nodeName === 'INPUT');
    displaySpan.innerText = "";
    displaySpan.style.color = "";
    displaySpan.style.fontWeight = "";

    const argsFilter = inputs.filter(input => input.placeholder !== "ether value (in wei)");
    const msgValue = inputs.filter(input => input.placeholder === "ether value (in wei)");

    let required = false;
    let invalidInputMessage = "";
    const args = argsFilter.map((input) => {
        const value = (input.value || "").trim();
        if (!input.placeholder.includes("string") && value === "") {
            required = true;
            return value;
        }

        if (input.placeholder.includes("bool")) {
            if (value.toLowerCase() === "true") {
                return true;
            }
            if (value.toLowerCase() === "false") {
                return false;
            }
            invalidInputMessage = `Invalid boolean value for "${input.placeholder}". Use true or false.`;
            return value;
        }

        if (value.includes('\'') || value.includes('\"') || value.includes('[') || value.includes(']')) {
            try {
                return JSON.parse(value);
            } catch (_err) {
                invalidInputMessage = `Invalid JSON-like input for "${input.placeholder}".`;
                return value;
            }
        }
        return value;
    });

    console.log(args)

    if (required) {
        displaySpan.innerText = "Error: Please enter all required fields";
        displaySpan.style.color = "red";
        displaySpan.style.fontWeight = "bold";
        return;
    }
    if (invalidInputMessage) {
        displaySpan.innerText = `Error: ${invalidInputMessage}`;
        displaySpan.style.color = "red";
        displaySpan.style.fontWeight = "bold";
        return;
    }

    const buttonText = button.innerText;
    const functionName = buttonText.slice(buttonText.indexOf(")") + 1, buttonText.length).trim();
    console.log("functionName: ", functionName);

    let result;
    let err;
    try {
        displaySpan.innerText = "Loading...";
        const executionContract = isCallFnc ? contract : (walletContract || contract);
        const contractMethod = executionContract.methods[functionName](...args);
        const hasAddress = !!address;
        const fromData = isPayable
            ? (hasAddress ? { from: address, value: msgValue?.[0]?.value || "0" } : { value: msgValue?.[0]?.value || "0" })
            : (hasAddress ? { from: address } : {});

        if (!isCallFnc) {
            await contractMethod.estimateGas(fromData);
        }
        displaySpan.innerText = isCallFnc ? "Loading..." : "Transaction Initiated...";
        displaySpan.classList.add("result");

        result = await contractMethod[isCallFnc ? "call" : "send"](fromData);

    } catch (error) {
        console.log(error)
        err = web3Errors?.getErrorMessage ? await web3Errors.getErrorMessage(error) : null;
        if (!err) {
            err = error?.message || "Error happened while trying to execute a function inside a smart contract";
        }
    }

    console.log("result: ", result);

    if (result || parseInt(result) == 0 || typeof result == "boolean" || (typeof result == "string" && result.length == 0)) {
        delete result["__length__"];
        const res = JSON.stringify(result, null, 4);
        result = res;
    } else {
        if (err?.name) {
            const res = JSON.stringify(err, null, 4);
            err = err.name + "\n\n" + res;
        }
        displaySpan.style.color = "red";
        displaySpan.style.fontWeight = "bold";
    }
    displaySpan.innerText = result || err || "\"\"";
}

export const connect = async () => {
    const { abi, chainid } = selectedLevel;
    const walletProvider = modal.getWalletProvider()
    if (!walletProvider) {
        setWalletMessage("Wallet not connected. Please connect wallet");
        setConnectWallet();
        setWalletSwitchButton(false);
        if (chainid) {
            setNetworkIdText(`Network ID: ${Number(chainid)}`);
        }
        console.log(
            'Wallet not connected. Please connect wallet'
        );
        return;
    } else {
        setWalletMessage(null, true);
    }

    let web3 = new Web3(walletProvider);
    let web3Errors = new Web3errors(walletProvider, [abi || []]);

    addSwitchNetworkEventListener();

    try {
        const address = modal.getAddress()
        if (!address) {
            setWalletMessage("Wallet not connected. Please connect wallet");
            setConnectWallet();
            setWalletSwitchButton(false);
            return;
        }

        setConnectWallet("Connecting...");
        let userBalance = "0";
        try {
            userBalance = await web3.eth.getBalance(address);
        } catch (_balanceErr) {
            // Keep UI usable if provider returns malformed/unsupported JSON-RPC response.
            userBalance = "0";
        }
        console.log("Connected: ", address)
        console.log("User Balance: ", userBalance)

        setWalletMessage(null, true);
        const networkid = Number(modal.getChainId() || chainid || 0);
        const symbol = getChainById(networkid)?.nativeCurrency?.symbol;
        setConnectWallet(`Connected: ${address.substring(0, 6)}...${address.substring(address.length - 4, address.length)} (${Web3BigNumber(userBalance).toSmall().trimDecimalPlaces(2)} ${symbol})`);
        setWalletSwitchButton(chainid !== "" && Number(chainid) !== Number(networkid));

        if (chainid != "" && chainid != parseInt(networkid)) {
            toggleChainErrorShow(false);
            try {
                await wallet_switchEthereumChain(chainid);
            } catch (_switchErr) {
                // Keep wallet connected state even when user rejects network switch.
                toggleChainErrorShow(false);
            }
        }

        toggleChainErrorShow();
        setNetworkIdText(`Network ID: ${parseInt(networkid) || ""}`);
        console.log("Chain ID: ", parseInt(networkid));

        setTopLevel({
            web3,
            web3Errors,
            userBalance,
            address
        })

    } catch (error) {
        const existingAddress = modal.getAddress() || topLevel.address;
        if (!existingAddress) {
            setWalletMessage("A wallet connection is required for transactions. Please connect a wallet.")
            setConnectWallet();
            setWalletSwitchButton(false);
        } else {
            setConnectWallet(`Connected: ${existingAddress.substring(0, 6)}...${existingAddress.substring(existingAddress.length - 4, existingAddress.length)}`);
        }
        console.log(error)
    }
}

export const settingWeb3 = async () => {
    const input_contractaddress = document.getElementById("contractaddress");
    const input_abi = document.getElementById("abi");
    const input_savename = document.getElementById("savename");
    const input_chainid = document.getElementById("chainid");

    const readtab = document.getElementById("readtab");
    const writetab = document.getElementById("writetab");

    const { abi, contractaddress, savename, chainid } = selectedLevel;
    let web3;
    let walletWeb3;
    let web3Errors;
    const walletProvider = modal.getWalletProvider() || window.ethereum;
    const walletAddress = modal.getAddress() || topLevel.address;
    const isWalletConnected = !!walletProvider && !!walletAddress;
    const chainRpc = getChainById(chainid)?.rpcUrls?.default?.http?.[0];

    // If wallet is connected, use wallet provider first for reads.
    // Otherwise keep existing chain RPC fallback behavior.
    if (isWalletConnected) {
        web3 = new Web3(walletProvider);
    } else if (chainRpc) {
        web3 = new Web3(chainRpc);
    } else if (walletProvider) {
        web3 = new Web3(walletProvider);
    }

    if (walletProvider) {
        walletWeb3 = new Web3(walletProvider);
        web3Errors = new Web3errors(walletProvider, [abi || []]);
    } else if (chainRpc) {
        web3Errors = new Web3errors(chainRpc, [abi || []]);
    } else {
        setWalletMessage('Wallet not connected. Please connect wallet');
    }

    input_contractaddress.value = (contractaddress || "").trim();
    input_abi.value = abi ? JSON.stringify(abi, null, 2) : "";
    input_savename.value = (savename || "").trim();
    input_chainid.value = (chainid || "").trim();
    if (chainid) {
        setNetworkIdText(`Network ID: ${Number(chainid)}`);
    }

    // await connect(abi, chainid);

    if (!abi || !contractaddress) {
        return;
    }

    readtab.innerHTML = "";
    writetab.innerHTML = "";

    if (web3) {
        setTopLevel({
            web3,
            web3Errors,
            contract: new web3.eth.Contract(abi, contractaddress),
            walletContract: walletWeb3 ? new walletWeb3.eth.Contract(abi, contractaddress) : null
        });
    } else {
        setTopLevel({
            contract: null,
            walletContract: null
        });
    }

    if (web3) {
        try {
            const contractBalance = await web3.eth.getBalance(contractaddress);
            setContractBalance(contractBalance);
        } catch (_err) {
            setContractBalance(0);
        }
    } else {
        setContractBalance(0);
    }

    const abiSorted = abi.sort((a, b) => {
        let x = a.name?.toLowerCase();
        let y = b.name?.toLowerCase();
        if (x < y) { return -1; }
        if (x > y) { return 1; }
        return 0;
    });

    const groups = abiSorted.filter(element => element.type === 'function')
        .map(element => {
            const button = document.createElement('button');
            button.textContent = `(${element.stateMutability}) ${element.name}`;
            button.onclick = (e) => handleClick(e, element.stateMutability === 'view' || element.stateMutability === 'pure', element.stateMutability === 'payable');
            button.setAttribute("class", `btn ${element.stateMutability === 'view' || element.stateMutability === 'pure' ? "callbtn" : element.stateMutability === 'payable' ? "paybtn" : "nonpaybtn"}`);

            const group = document.createElement('div');
            group.setAttribute("class", "group");
            group.ariaLabel = element.stateMutability === 'view' || element.stateMutability === 'pure' ? "read" : "write";

            const panel = document.createElement('div');
            panel.setAttribute("class", "accordian-panel");

            const panelTitle = document.createElement('button');
            panelTitle.setAttribute("class", "accordian-title");
            panelTitle.textContent = `${element.name}`;
            panelTitle.addEventListener("click", () => {
                group.classList.toggle("activepanel")
            })

            const brEle = document.createElement('br');
            group.appendChild(panelTitle);
            panel.appendChild(button);

            for (let i = 0; i < element.inputs.length; i++) {
                const input = element.inputs[i];
                const inputText = document.createElement('input');
                inputText.setAttribute("type", "text");
                inputText.setAttribute("placeholder", `${input.type} ${input.name}`);
                inputText.setAttribute("required", "true");
                inputText.setAttribute("class", "inputdata");
                panel.appendChild(inputText);
            }

            if (element.stateMutability === 'payable') {
                const inputText = document.createElement('input');
                inputText.setAttribute("type", "text");
                inputText.setAttribute("placeholder", `ether value (in wei)`);
                inputText.setAttribute("required", "true");
                inputText.setAttribute("class", "inputdata");
                panel.appendChild(inputText);
            }

            const display = document.createElement('span');

            panel.appendChild(brEle);
            panel.appendChild(display);
            group.appendChild(panel);
            return group;

        });

    for (let i = 0; i < groups.length; i++) {
        if (groups[i].ariaLabel === "read") {
            readtab.appendChild(groups[i]);
        } else {
            writetab.appendChild(groups[i]);
        }
    }
}

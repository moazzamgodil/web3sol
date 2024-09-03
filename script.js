
import Web3 from 'web3';
import { web3Number } from './web3Number';
import { Web3errors } from 'web3-errors-extract';

BigInt.prototype.toJSON = function () {
    return this.toString();
};

const eth_requestAccounts = async () => {
    const accounts = await window.ethereum.request({
        "method": "eth_requestAccounts",
        "params": []
    });
    return accounts;
}

const wallet_switchEthereumChain = async (chainid) => {
    await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: "0x" + Number(chainid).toString(16) }]
    });
}

export const topLevel = {
    contract: null,
    address: null,
    userBalance: null,
    web3: null,
    web3Errors: null
}

export const setDataToLocalStorage = (name, data) => {
    window.localStorage.setItem(name, data);
}

export const getDataFromLocalStorage = (name) => {
    return window.localStorage.getItem(name);
}

export const reloadWindow = () => {
    window.location.reload();
}

const handleClick = async (event, isCallFnc, isPayable) => {
    const button = event.target;
    console.log(button)

    const { contract, web3Errors, address } = topLevel;

    const children = [...button.parentNode.children];
    const inputs = children.filter(element => element.nodeName === 'INPUT');
    const displaySpan = children[children.length - 1];
    displaySpan.innerText = "";
    displaySpan.style.color = "";
    displaySpan.style.fontWeight = "";

    const argsFilter = inputs.filter(input => input.placeholder !== "ether value (in wei)");
    const msgValue = inputs.filter(input => input.placeholder === "ether value (in wei)");

    let required = false;
    const args = argsFilter.map(input => {
        if (!input.placeholder.includes("string") && input.value == "") {
            required = true;
        } else if (input.value.includes('\'') || input.value.includes('\"') || input.value.includes('[') || input.value.includes(']')) {
            return JSON.parse(input.value);
        } else if (input.placeholder.includes("bool")) {
            return Boolean(input.value);
        }
        return input.value;
    });

    console.log(args)

    if (required) {
        displaySpan.innerText = "Error: Please enter all required fields";
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
        const contractMethod = contract.methods[functionName](...args);
        const fromData = isPayable ? { from: address, value: msgValue[0].value } : { from: address };
        await contractMethod.estimateGas(fromData);
        displaySpan.innerText = isCallFnc ? "Loading..." : "Transaction Initiated...";

        result = await contractMethod[isCallFnc ? "call" : "send"](fromData);

    } catch (error) {
        console.log(error)
        err = await web3Errors.getErrorMessage(error);
    }

    console.log("result: ", result);

    if (result || parseInt(result) == 0 || typeof result == "boolean") {
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
    displaySpan.innerText = result || err;
}

export const connect = async (abi, chainid) => {
    const connectwalletBtn = document.querySelector("#connectwallet");
    const metamask_msg = document.querySelector("#metamask_msg");
    const rpc_error = document.querySelector("#rpc-error");
    const chain_error = document.querySelector("#chain-error");
    const switch_network = document.querySelector("#switch-network");
    const network_id = document.querySelector("#network_id");

    if (!window.ethereum) {
        metamask_msg.innerHTML = 'Non-Ethereum browser detected. Required metamask for transactions or connect to rpc url';
        rpc_error.style.display = "block";
        console.log(
            'Non-Ethereum browser detected. You should consider trying MetaMask!'
        );
        return;
    }

    let web3 = new Web3(window.ethereum);
    let web3Errors = new Web3errors(window.ethereum, [abi || []]);
    connectwalletBtn.innerText = "Connecting...";

    switch_network.addEventListener("click", async () => {
        await wallet_switchEthereumChain(chainid);
    });

    try {
        const accounts = await eth_requestAccounts();
        let address = accounts[0];
        let userBalance = await web3.eth.getBalance(address);
        console.log("Connected: ", address)

        window.ethereum.on("accountsChanged", async (accounts) => {
            address = accounts[0];
            userBalance = await web3.eth.getBalance(address);
            console.log("Connected: ", address)
            metamask_msg.innerHTML = address ? `Metamask Connected (${address}) (${web3Number(userBalance)} eth)` : "Required metamask for transactions. Metamask Not Connected";
            connectwalletBtn.style.display = address ? "none" : "block";
        });

        window.ethereum.on("chainChanged", () => reloadWindow());

        const networkid = await window.ethereum.request({
            "method": "eth_chainId",
            "params": []
        });

        if (chainid != "" && chainid != parseInt(networkid)) {
            chain_error.style.display = "block";
            await wallet_switchEthereumChain(chainid);
        }

        network_id.innerHTML = `Network ID: ${parseInt(networkid)}`;
        console.log("Chain ID: ", parseInt(networkid));

        metamask_msg.innerHTML = `Metamask Connected (${address}) (${web3Number(userBalance)} eth)`;
        connectwalletBtn.innerText = "Connect Metamask";
        connectwalletBtn.style.display = "none";

        topLevel.web3 = web3;
        topLevel.web3Errors = web3Errors;
        topLevel.address = address;
        topLevel.userBalance = userBalance;

    } catch (error) {
        metamask_msg.innerHTML = "Required metamask for transactions. Metamask Not Connected";
        connectwalletBtn.innerText = "Connect Metamask";
        connectwalletBtn.style.display = "block";
        console.log(error)
    }
}

export const settingWeb3 = async (selectedLevel) => {
    const rpc_error = document.querySelector("#rpc-error");
    const metamask_msg = document.querySelector("#metamask_msg");
    const contract_balance = document.querySelector("#contract_balance");

    const input_web3rpc = document.getElementById("web3rpc");
    const input_contractaddress = document.getElementById("contractaddress");
    const input_abi = document.getElementById("abi");
    const input_savename = document.getElementById("savename");
    const input_chainid = document.getElementById("chainid");

    const container = document.getElementById("container");

    const { abi, contractaddress, rpc, savename, chainid } = selectedLevel;

    let web3;
    let web3Errors;
    if (rpc) {
        web3 = new Web3(rpc);
        web3Errors = new Web3errors(rpc, [abi || []]);
        rpc_error.style.display = "none";
    } else if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        web3Errors = new Web3errors(window.ethereum, [abi || []]);
        rpc_error.style.display = "none";
    } else {
        rpc_error.style.display = "block";
        metamask_msg.innerHTML = 'Non-Ethereum browser detected. Required metamask for transactions or connect to rpc url';
    }

    input_web3rpc.value = rpc || "";
    input_contractaddress.value = contractaddress || "";
    input_abi.value = abi ? JSON.stringify(abi, null, 2) : "";
    input_savename.value = savename || "";
    input_chainid.value = chainid || "";

    await connect(abi, chainid);

    if (!abi || !contractaddress || !web3) {
        return;
    }

    topLevel.web3 = web3;
    topLevel.web3Errors = web3Errors;
    topLevel.contract = new web3.eth.Contract(abi, contractaddress);
    const contractBalance = await web3.eth.getBalance(contractaddress);
    contract_balance.innerHTML = `Contract Balance: ${web3Number(contractBalance)} eth`;

    const groups = abi.filter(element => element.type === 'function')
        .map(element => {
            const button = document.createElement('button');
            button.textContent = `(${element.stateMutability}) ${element.name}`;
            button.onclick = (e) => handleClick(e, element.stateMutability === 'view' || element.stateMutability === 'pure', element.stateMutability === 'payable');
            button.setAttribute("class", `btn ${element.stateMutability === 'view' || element.stateMutability === 'pure' ? "callbtn" : element.stateMutability === 'payable' ? "paybtn" : "nonpaybtn"}`);

            const group = document.createElement('div');
            group.setAttribute("class", "group");

            const brEle = document.createElement('br');
            group.appendChild(button);

            for (let i = 0; i < element.inputs.length; i++) {
                const input = element.inputs[i];
                const inputText = document.createElement('input');
                inputText.setAttribute("type", "text");
                inputText.setAttribute("placeholder", `${input.type} ${input.name}`);
                inputText.setAttribute("required", "true");
                inputText.setAttribute("class", "inputdata");
                group.appendChild(inputText);
            }

            if (element.stateMutability === 'payable') {
                const inputText = document.createElement('input');
                inputText.setAttribute("type", "text");
                inputText.setAttribute("placeholder", `ether value (in wei)`);
                inputText.setAttribute("required", "true");
                inputText.setAttribute("class", "inputdata");
                group.appendChild(inputText);
            }

            const display = document.createElement('span');

            group.appendChild(brEle);
            group.appendChild(display);
            return group;

        });

    for (let i = 0; i < groups.length; i++) {
        container.appendChild(groups[i]);
    }
}
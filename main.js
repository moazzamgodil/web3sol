import './style.css'
import Web3 from 'web3';
import { web3Number } from './web3Number';
import { Web3errors } from 'web3-errors-extract';

BigInt.prototype.toJSON = function () {
    return this.toString();
};

window.addEventListener('load', async () => {
    let contract;
    let address;
    let userBalance;
    let web3;

    let web3Errors;

    const connectwalletBtn = document.querySelector("#connectwallet");
    const metamask_msg = document.querySelector("#metamask_msg");
    const network_id = document.querySelector("#network_id");
    const contract_balance = document.querySelector("#contract_balance");
    const rpc_error = document.querySelector("#rpc-error");
    const web3form = document.querySelector("#web3details");
    const contract_list = document.querySelector("#contract_list");
    const deletecontract = document.querySelector("#delete_contract");

    let abi;
    let contractaddress;
    let rpc;
    let savename;
    let chainid;

    let data;
    let contractsArray;

    contract_list.addEventListener("change", async (event) => {
        contractaddress = event.target.value;
        abi = JSON.parse(data[contractaddress]?.abi);
        rpc = data[contractaddress]?.rpc;
        savename = data[contractaddress]?.savename;
        chainid = data[contractaddress]?.chainid;

        window.localStorage.setItem('index', contractsArray.indexOf(contractaddress));
        window.location.reload();
    });

    deletecontract.addEventListener("click", async (event) => {
        if (!contractaddress) {
            return;
        }

        delete data[contractaddress];
        contractsArray = contractsArray.filter(contract => contract !== contractaddress);
        window.localStorage.setItem('contracts', JSON.stringify(contractsArray));
        window.localStorage.setItem('data', JSON.stringify(data));
        window.location.reload();
    });

    const getFromLocalStorage = async () => {
        const getData = window.localStorage.getItem('data');
        const getContractsArray = window.localStorage.getItem('contracts');
        const getSelectedIndex = window.localStorage.getItem('index');
        data = getData ? JSON.parse(getData) : {};
        contractsArray = getContractsArray ? JSON.parse(getContractsArray) : [];
        contract_list.innerHTML = "";
        if (contractsArray?.length > 0) {
            contractsArray.forEach((contract) => {
                const name = data[contract]?.savename || "Unknown Name";
                const chain = data[contract]?.chainid || "Unknown Chain";
                contract_list.innerHTML += `<option value=${contract}>(${name}) (Chain ID: ${chain}) ${contract}</option>`;
            })
            deletecontract.style.display = "inline-block";
        } else {
            contract_list.innerHTML += `<option disabled value="">No Saved Contracts</option>`;
        }
        contractaddress = contractsArray.length > 0 ? contractsArray[getSelectedIndex || 0] : "";
        abi = data?.[contractaddress] ? JSON.parse(data[contractaddress]?.abi) : "";
        rpc = data?.[contractaddress] ? data[contractaddress]?.rpc : "";
        savename = data?.[contractaddress] ? data[contractaddress]?.savename : "";
        chainid = data?.[contractaddress] ? data[contractaddress]?.chainid : "";
        contract_list.value = contractaddress;

        await settingWeb3();
    }

    web3form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(web3form);
        const _rpc = formData.get("web3rpc");
        const _contractaddress = formData.get("contractaddress");
        const _abi = formData.get("abi");
        const _savename = formData.get("savename");
        const _chainid = formData.get("chainid");

        let requiredEmpty = [];

        if (!_contractaddress) {
            requiredEmpty.push("Contract Address");
        }

        if (!_abi) {
            requiredEmpty.push("ABI");
        }

        if (!_savename) {
            requiredEmpty.push("Name");
        }

        if (!_chainid) {
            requiredEmpty.push("Chain ID");
        }

        if (requiredEmpty.length > 0) {
            if (requiredEmpty.length > 1) {
                requiredEmpty.push(requiredEmpty[requiredEmpty.length - 1]);
                requiredEmpty[requiredEmpty.length - 2] = "and";
            }

            alert(`${requiredEmpty.join(", ")} are required fields.`);
            return;
        }

        data[_contractaddress] = { chainid: _chainid, savename: _savename, rpc: _rpc, contractaddress: _contractaddress, abi: _abi };

        if (!contractsArray.includes(_contractaddress)) {
            contractsArray.push(_contractaddress);
        }

        window.localStorage.setItem('contracts', JSON.stringify(contractsArray));
        window.localStorage.setItem('data', JSON.stringify(data));

        window.location.reload();
    });

    connectwalletBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        await connect();
    });

    const connect = async () => {
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
            web3Errors = new Web3errors(window.ethereum, [abi || []]);
            connectwalletBtn.innerText = "Connecting...";
            try {
                // Request account access if needed
                const accounts = await window.ethereum.request({
                    "method": "eth_requestAccounts",
                    "params": []
                });
                address = accounts[0];
                userBalance = await web3.eth.getBalance(address);
                console.log("Connected: ", address)

                window.ethereum.on("accountsChanged", async (accounts) => {
                    address = accounts[0];
                    userBalance = await web3.eth.getBalance(address);
                    console.log("Connected: ", address)
                    metamask_msg.innerHTML = address ? `Metamask Connected (${address}) (${web3Number(userBalance)} eth)` : "Required metamask for transactions. Metamask Not Connected";
                    connectwalletBtn.style.display = address ? "none" : "block";
                });

                window.ethereum.on("chainChanged", () => window.location.reload());

                const networkid = await window.ethereum.request({
                    "method": "eth_chainId",
                    "params": []
                });

                if(chainid != "" && chainid != parseInt(networkid)) {
                    document.querySelector("#chain-error").style.display = "block";
                    document.querySelector("#switch-network").addEventListener("click", async () => {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: "0x" + Number(chainid).toString(16) }], // chainId must be in hexadecimal numbers
                        });
                    });
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: "0x" + Number(chainid).toString(16) }], // chainId must be in hexadecimal numbers
                    });
                }

                network_id.innerHTML = `Network ID: ${parseInt(networkid)}`;
                console.log("Chain ID: ", parseInt(networkid));

                metamask_msg.innerHTML = `Metamask Connected (${address}) (${web3Number(userBalance)} eth)`;
                connectwalletBtn.innerText = "Connect Metamask";
                connectwalletBtn.style.display = "none";
            } catch (error) {
                metamask_msg.innerHTML = "Required metamask for transactions. Metamask Not Connected";
                connectwalletBtn.innerText = "Connect Metamask";
                connectwalletBtn.style.display = "block";
                console.log(error)
            }
        } else {
            metamask_msg.innerHTML = 'Non-Ethereum browser detected. Required metamask for transactions or connect to rpc url';
            rpc_error.style.display = "block";
            console.log(
                'Non-Ethereum browser detected. You should consider trying MetaMask!'
            );
        }
    }

    const settingWeb3 = async () => {
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

        document.getElementById("web3rpc").value = rpc || "";
        document.getElementById("contractaddress").value = contractaddress || "";
        document.getElementById("abi").value = abi ? JSON.stringify(abi, null, 2) : "";
        document.getElementById("savename").value = savename || "";
        document.getElementById("chainid").value = chainid || "";

        await connect();

        if (!abi || !contractaddress || !web3) {
            return;
        }

        contract = new web3.eth.Contract(abi, contractaddress);
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

        const container = document.getElementById("container");

        for (let i = 0; i < groups.length; i++) {
            container.appendChild(groups[i]);
        }
    }

    const handleClick = async (event, isCallFnc, isPayable) => {
        const button = event.target;
        console.log(button)

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
            } else if (input.value.includes('\"') || input.value.includes('[') || input.value.includes(']')) {
                return JSON.parse(input.value);
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
            err = await web3Errors.getErrorMessage(error);
        }

        console.log("result: ", result);

        if (result || parseInt(result) == 0) {
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

    getFromLocalStorage();

});
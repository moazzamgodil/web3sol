let contract;
let address;
let web3;

const connectwalletBtn = document.getElementById("connectwallet");
const metamask_msg = document.getElementById("metamask_msg");

const connect = async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        connectwalletBtn.innerText = "Connecting...";
        try {
            // Request account access if needed
            const accounts = await window.ethereum.request({
                "method": "eth_requestAccounts",
                "params": []
            });
            address = accounts[0];
            console.log(address)

            window.ethereum.on("accountsChanged", async (accounts) => {
                address = accounts[0];
                console.log(address)
                metamask_msg.innerHTML = address ? `Metamask Connected (${address})` : "Required metamask for transactions. Metamask Not Connected";
                connectwalletBtn.style.display = address ? "none" : "block";
            });

            metamask_msg.innerHTML = `Metamask Connected (${address})`;
            connectwalletBtn.innerText = "Connect Metamask";
            connectwalletBtn.style.display = "none";
        } catch (error) {
            metamask_msg.innerHTML = "Required metamask for transactions. Metamask Not Connected";
            connectwalletBtn.innerText = "Connect Metamask";
            connectwalletBtn.style.display = "block";
            console.log(error)
        }
    } else {
        console.log(
            'Non-Ethereum browser detected. You should consider trying MetaMask!'
        );
    }
}

window.addEventListener('load', async () => {

    const abi = JSON.parse(window.localStorage.getItem('abi'));
    const contractaddress = window.localStorage.getItem('contractaddress');
    const rpc = window.localStorage.getItem('rpc');
    if (rpc) {
        web3 = new Web3(rpc);
    }

    document.getElementById("web3rpc").value = rpc;
    document.getElementById("contractaddress").value = contractaddress;
    document.getElementById("abi").value = JSON.stringify(abi, null, 2);

    await connect();

    if (!abi || !contractaddress || !web3) {
        return;
    }

    contract = new web3.eth.Contract(abi, contractaddress);

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

            // group.appendChild(brEle);

            const display = document.createElement('span');

            group.appendChild(brEle);
            group.appendChild(display);
            return group;

        });

    const container = document.getElementById("container");

    for (let i = 0; i < groups.length; i++) {
        container.appendChild(groups[i]);
    }
});

const METAMASK_POSSIBLE_ERRORS = {
    '-32700': {
        standard: 'JSON RPC 2.0',
        message: 'Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.',
    },
    '-32600': {
        standard: 'JSON RPC 2.0',
        message: 'The JSON sent is not a valid Request object.',
    },
    '-32601': {
        standard: 'JSON RPC 2.0',
        message: 'The method does not exist / is not available.',
    },
    '-32602': {
        standard: 'JSON RPC 2.0',
        message: 'Invalid method parameter(s).',
    },
    '-32603': {
        standard: 'JSON RPC 2.0',
        message: 'Internal JSON-RPC error.',
    },
    '-32000': {
        standard: 'EIP-1474',
        message: 'Invalid input or Insufficient Funds.',
    },
    '-32001': {
        standard: 'EIP-1474',
        message: 'Resource not found.',
    },
    '-32002': {
        standard: 'EIP-1474',
        message: 'Resource unavailable.',
    },
    '-32003': {
        standard: 'EIP-1474',
        message: 'Transaction rejected.',
    },
    '-32004': {
        standard: 'EIP-1474',
        message: 'Method not supported.',
    },
    '-32005': {
        standard: 'EIP-1474',
        message: 'Request limit exceeded.',
    },
    '4001': {
        standard: 'EIP-1193',
        message: 'User rejected the request.',
    },
    '4100': {
        standard: 'EIP-1193',
        message: 'The requested account and/or method has not been authorized by the user.',
    },
    '4200': {
        standard: 'EIP-1193',
        message: 'The requested method is not supported by this Ethereum provider.',
    },
    '4900': {
        standard: 'EIP-1193',
        message: 'The provider is disconnected from all chains.',
    },
    '4901': {
        standard: 'EIP-1193',
        message: 'The provider is disconnected from the specified chain.',
    },
    '4902': {
        standard: 'EIP-1193',
        message: 'Unrecognized Chain ID / Chain not found.',
    },
}

const getErrFromWeb3 = async (err) => {
    const defaultErrMsg = "Something went wrong. Please try again later.";
    if (err && err?.code) {
        if (METAMASK_POSSIBLE_ERRORS[err.code]) {
            return METAMASK_POSSIBLE_ERRORS[err.code].message;
        } else if (err.code === "ACTION_REJECTED") {
            return "User rejected signing";
        } else {
            return err.message;
        }
    }
    let chkErr = err?.toString();
    if (
        chkErr &&
        chkErr?.startsWith("Error: Transaction has been reverted by the EVM:")
    ) {
        const errorObjectStr = err.message.slice(42);
        const errorObject = JSON.parse(errorObjectStr);
        let txHash = errorObject.transactionHash;
        try {
            const tx = await web3.eth.getTransaction(txHash);
            var result = await web3.eth.call(tx);
            result = result.startsWith("0x") ? result : `0x${result}`;
            if (result && result.substring(138)) {
                const reason = web3.utils.toAscii(result.substring(138));
                console.log("Revert reason:", reason);
                return reason;
            } else {
                console.log("Cannot get reason");
            }
        } catch (e) {
            var errMsg2 = e.toString();
            if (errMsg2) {
                if (errMsg2.startsWith("Error")) {
                    var errObj2 = errMsg2.slice(errMsg2.indexOf("{"), errMsg2.length);
                    if (errObj2.indexOf("{") !== -1 && errObj2.lastIndexOf("}")) {
                        errObj2 = JSON.parse(errObj2);
                        return errObj2.message;
                    }
                }
                console.log(errMsg2);
            }
            console.log(err);
            return defaultErrMsg;
        }
    } else {
        console.log(err);
        return defaultErrMsg;
    }
};

const getErrorMessage = async (err) => {
    const defaultErrMsg = "Something went wrong. Please try again later.";
    if (err?.message && err.message?.includes("Internal JSON-RPC error.")) {
        let errMsg = err.message;
        if (typeof err.message !== "string") {
            errMsg = err.message.toString();
        }
        var errObj = errMsg.slice(errMsg.indexOf("{"), errMsg.length);
        if (errObj.indexOf("{") !== -1 && errObj.lastIndexOf("}")) {
            errObj = JSON.parse(errObj);
            const _errFromWeb3 = await getErrFromWeb3(errObj);
            return _errFromWeb3;
        }
    } else if (
        err?.message &&
        err.message?.includes("execution reverted:") &&
        err.message?.indexOf("{") !== -1
    ) {
        let jsonObj = JSON.parse(
            err.message.slice(
                err.message.indexOf("{"),
                err.message.lastIndexOf("}") + 1
            )
        );
        if (jsonObj?.originalError) {
            return jsonObj.originalError.message;
        }
        return jsonObj;
    } else if (err?.message && err.message?.includes("execution reverted:")) {
        return err.message.slice(
            err.message.indexOf("execution reverted:"),
            err.message.length
        );
    }
    const errFromWeb3 = getErrFromWeb3(err);
    if (errFromWeb3) {
        return errFromWeb3;
    }
    return defaultErrMsg;
};

async function handleClick(event, isCallFnc, isPayable) {
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
        }
        return input.value;
    });
    
    if(required) {
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
        await contractMethod.estimateGas({ from: address });

        result = await contractMethod[isCallFnc ? "call" : "send"](isPayable ? { from: address, value: msgValue[0].value } : { from: address });

    } catch (error) {
        err = await getErrorMessage(error);
    }

    console.log("result: ", result);

    if(result) {
        const res = JSON.stringify(result);
        result = res.replaceAll("{", "{\n\t").replaceAll(",", ",\n\t").replaceAll("}", "\n}\n");
    } else {
        displaySpan.style.color = "red";
        displaySpan.style.fontWeight = "bold";
    }
    displaySpan.innerText = result || err;
}

const web3form = document.getElementById("web3details");
web3form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(web3form);
    const rpc = formData.get("web3rpc");
    const contractaddress = formData.get("contractaddress");
    const abi = formData.get("abi");

    window.localStorage.setItem('rpc', rpc);
    window.localStorage.setItem('contractaddress', contractaddress);
    window.localStorage.setItem('abi', abi);

    window.location.reload();
});

connectwalletBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    await connect();
});
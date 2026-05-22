import './style.css'
import { connect, settingWeb3 } from "./script";
import { createAppKit } from '@reown/appkit'
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5'
import { chains, getChainById } from './helper/chainsRpc';
import { Web3BigNumber } from 'web3-bignumber';

export let selectedLevel = {
    abi: null,
    contractaddress: null,
    savename: null,
    chainid: null
}

export let localLevel = {
    data: null,
    contractsArray: null
}

export let topLevel = {
    contract: null,
    walletContract: null,
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

export const setSelectedLevel = (data) => {
    selectedLevel = { ...selectedLevel, ...data };
}

export const setLocalLevel = (data) => {
    localLevel = { ...localLevel, ...data };
}

export const setTopLevel = (data) => {
    topLevel = { ...topLevel, ...data };
}

const projectId = 'f2bb0649f5887ff28dfb644181b86f91'
const allChains = chains();

const metadata = {
    name: 'Web3sol',
    description: 'AppKit Example',
    url: 'https://reown.com/appkit', // origin must match your domain & subdomain
    icons: ['https://assets.reown.com/reown-profile-pic.png']
}

export const modal = createAppKit({
    adapters: [new Ethers5Adapter()],
    networks: allChains,
    metadata,
    projectId,
    features: {
        connectMethodsOrder: ['wallet'],
        analytics: true // Optional - defaults to your Cloud configuration
    }
})

// Contract fields container
const container = document.getElementById("container");
// Connect wallet button
const connectwalletBtn = document.querySelector("#connectwallet");
const walletSwitchBtn = document.querySelector("#wallet_switch_btn");
// Wallet error message
const wallet_msg = document.querySelector("#wallet_msg");
// Network Id text
const network_id = document.querySelector("#network_id");
// Chain error message
const chain_error = document.querySelector("#chain-error");
// Switch network clickable text
const switch_network = document.querySelector("#switch-network");
// Contract balance text
const contract_balance = document.querySelector("#contract_balance");
// Web3 details form
const web3form = document.querySelector("#web3details");
const openContractModalBtn = document.querySelector("#open_contract_modal");
const contractModal = document.querySelector("#contract_modal");
const closeContractModalBtn = document.querySelector("#close_contract_modal");
const contractModalList = document.querySelector("#contract_modal_list");
// Form button (save)
const formbtn = document.querySelector("#formbtn");
// Form button (edit)
const editbtn = document.querySelector("#editbtn");
// Form button (add new)
const addnewbtn = document.querySelector("#addnewbtn");

// Button Read Tab
const readbtn = document.querySelector("#readbtn");
// Button Write Tab
const writebtn = document.querySelector("#writebtn");
// Read Tab Container
const readtab = document.querySelector("#readtab");
// Write Tab Container
const writetab = document.querySelector("#writetab");

// FORM FIELDS
const input_contractaddress = document.getElementById("contractaddress");
const input_abi = document.getElementById("abi");
const input_savename = document.getElementById("savename");
const input_chainid = document.getElementById("chainid");
const input_chain_search = document.getElementById("chain-search");
const chain_dropdown = document.getElementById("chain-dropdown");
const chain_options = document.getElementById("chain-options");

const docLoad = document.querySelector("#load");
const docBody = document.querySelector("body");
let hasSwitchNetworkListener = false;
let noContractsMessageNode = null;
let networkOptions = [];
let selectedContractInModal = "";


export const setConnectWallet = (text = "Connect Wallet") => {
    connectwalletBtn.innerText = text;
}

export const setWalletSwitchButton = (isVisible = false) => {
    walletSwitchBtn.style.display = isVisible ? "inline-block" : "none";
}

export const setWalletMessage = (text = null, isHidden = false) => {
    if (text) {
        wallet_msg.innerHTML = text;
    }
    wallet_msg.style.display = isHidden ? "none" : "block";
}

export const setNetworkIdText = (text = "") => {
    network_id.innerHTML = text;
}

export const toggleChainErrorShow = (isHidden = true) => {
    chain_error.style.display = isHidden ? "none" : "block";
}

export const setContractBalance = (balance) => {
    const { chainid } = selectedLevel;
    const symbol = getChainById(chainid)?.nativeCurrency?.symbol;
    contract_balance.innerHTML = `Contract Balance: ${Web3BigNumber(balance).toSmall().trimDecimalPlaces(2)} ${symbol}`;
}

export const wallet_switchEthereumChain = async (chainid) => {
    const chain = getChainById(chainid);
    modal.switchNetwork(chain)
}

export const addSwitchNetworkEventListener = (chainid) => {
    if (hasSwitchNetworkListener) {
        return;
    }
    hasSwitchNetworkListener = true;
    switch_network.addEventListener("click", async () => {
        const { chainid } = selectedLevel;
        if (!chainid) {
            return;
        }
        await wallet_switchEthereumChain(chainid);
    });
}

const requestSwitchToSelectedChain = async () => {
    const { chainid } = selectedLevel;
    if (!chainid) {
        return { attempted: false, switched: false };
    }

    const walletProvider = modal.getWalletProvider();
    const address = modal.getAddress() || topLevel.address;
    if (!walletProvider || !address) {
        return { attempted: false, switched: false };
    }

    const walletChainId = Number(modal.getChainId());
    const targetChainId = Number(chainid);
    if (targetChainId !== walletChainId) {
        toggleChainErrorShow(false);
        try {
            await wallet_switchEthereumChain(targetChainId);
            return { attempted: true, switched: true };
        } catch (_err) {
            // Revert selected chain back to wallet network when switch is rejected/closed.
            setChainSelection(String(walletChainId), false);
            toggleChainErrorShow(true);
            return { attempted: true, switched: false };
        }
    } else {
        toggleChainErrorShow(true);
    }
    return { attempted: false, switched: true };
}

const getFromLocalStorage = async () => {

    const getData = getDataFromLocalStorage("data");
    const getContractsArray = getDataFromLocalStorage("contracts");
    const getSelectedIndex = getDataFromLocalStorage("index");

    const data = getData ? JSON.parse(getData) : {};
    const contractsArray = getContractsArray ? JSON.parse(getContractsArray) : [];
    if (contractsArray?.length > 0) {
        if (openContractModalBtn) {
            openContractModalBtn.disabled = false;
        }
        contract_balance.style.display = "block";
    } else {
        if (openContractModalBtn) {
            openContractModalBtn.disabled = true;
        }
        contract_balance.style.display = "none";
        if (!noContractsMessageNode) {
            noContractsMessageNode = document.createElement("p");
            noContractsMessageNode.className = "empty-state";
            noContractsMessageNode.innerText = "No saved contracts yet. Add one to get started.";
            container.appendChild(noContractsMessageNode);
        }
        readbtn.style.display = "none";
        writebtn.style.display = "none";
        readtab.style.display = "none";
        writetab.style.display = "none";
    }

    setLocalLevel({
        data,
        contractsArray
    });

    let index = getSelectedIndex;
    if (index >= contractsArray.length && contractsArray.length > 0) {
        setDataToLocalStorage("index", contractsArray.length - 1);
        index = contractsArray.length - 1;
    }

    const contractaddress = contractsArray.length > 0 ? contractsArray[index || 0] : "";
    const abi = data?.[contractaddress] ? JSON.parse(data[contractaddress]?.abi) : "";
    const savename = data?.[contractaddress] ? data[contractaddress]?.savename : "";
    const chainid = data?.[contractaddress] ? data[contractaddress]?.chainid : "";

    setSelectedLevel({
        abi,
        contractaddress,
        savename,
        chainid
    });
    input_chainid.value = chainid ? String(chainid) : "";
    input_chain_search.value = getChainLabel(chainid);
    selectedContractInModal = contractaddress;

    if (contractaddress != "") {

        input_contractaddress.disabled = true;
        input_abi.disabled = true;
        input_savename.disabled = true;
        input_chainid.disabled = true;
        input_chain_search.disabled = true;

        formbtn.style.display = "none";
        editbtn.style.display = "inline-block";
    }

    await settingWeb3();
}

const getChainLabel = (chainId) => {
    const chain = networkOptions.find((network) => String(network.id) === String(chainId));
    return chain ? `${chain.name} (${chain.id})` : "";
}

const setChainSelection = (chainId, shouldRequestSwitch = true) => {
    if (input_chain_search.disabled) {
        return;
    }
    input_chainid.value = String(chainId || "");
    setSelectedLevel({ chainid: String(chainId || "") });
    input_chain_search.value = getChainLabel(chainId);
    chain_dropdown.classList.remove("open");
    if (shouldRequestSwitch) {
        requestSwitchToSelectedChain().then(() => connect());
    }
}

const renderChainOptions = (query = "") => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
        ? networkOptions.filter((network) =>
            network.name.toLowerCase().includes(normalizedQuery)
            || String(network.id).includes(normalizedQuery))
        : networkOptions;

    chain_options.innerHTML = "";
    if (filtered.length === 0) {
        const noResult = document.createElement("div");
        noResult.className = "chain-option chain-option-empty";
        noResult.innerText = "No network found";
        chain_options.appendChild(noResult);
        return;
    }

    filtered.forEach((network) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "chain-option";
        option.innerText = `${network.name} (${network.id})`;
        option.dataset.value = String(network.id);
        option.addEventListener("click", () => setChainSelection(network.id));
        chain_options.appendChild(option);
    });
}

const setModalVisibility = (isOpen) => {
    contractModal.style.display = isOpen ? "flex" : "none";
}

const renderContractsModalList = () => {
    const { data, contractsArray } = localLevel;
    contractModalList.innerHTML = "";

    if (!contractsArray || contractsArray.length === 0) {
        contractModalList.innerHTML = `<p class="empty-state">No saved contracts yet. Add one to get started.</p>`;
        return;
    }

    contractsArray.forEach((contract) => {
        const item = document.createElement("div");
        item.className = `contract-item ${selectedContractInModal === contract ? "selected" : ""}`;
        const name = data[contract]?.savename || "Unknown Name";
        const chain = getChainById(data[contract]?.chainid)?.name || "Unknown Chain";
        item.innerHTML = `
            <div class="contract-item-main">
                <p><strong>${name}</strong></p>
                <p>Chain: ${chain}</p>
                <p>${contract}</p>
            </div>
            <div class="contract-item-actions">
                <button class="blackbtn contract-select-btn" data-address="${contract}">Select</button>
                <button class="blackbtn contract-remove-btn" data-address="${contract}">Remove</button>
            </div>
        `;
        contractModalList.appendChild(item);
    });
}

window.addEventListener('load', async () => {

    modal.subscribeState(async (e) => {
        if (e.initialized && !e.loading && !e.open) {
            console.log("Web3 Initialized")
            await connect();
            docLoad.style.display = "none";
            docBody.style.overflow = "auto";
        }
    })

    networkOptions = chains().map((network) => ({ name: network.name, id: network.id }))
        .sort((a, b) => a.name.localeCompare(b.name));
    renderChainOptions();

    input_chain_search.addEventListener("focus", () => {
        if (input_chain_search.disabled) {
            return;
        }
        chain_dropdown.classList.add("open");
        renderChainOptions(input_chain_search.value);
    });
    input_chain_search.addEventListener("click", () => {
        if (input_chain_search.disabled) {
            return;
        }
        chain_dropdown.classList.add("open");
        renderChainOptions(input_chain_search.value);
    });

    input_chain_search.addEventListener("input", (event) => {
        if (input_chain_search.disabled) {
            return;
        }
        chain_dropdown.classList.add("open");
        renderChainOptions(event.target.value);
    });

    chain_options.addEventListener("click", () => {
        chain_dropdown.classList.add("open");
    });

    document.addEventListener("mousedown", (event) => {
        if (!chain_dropdown.contains(event.target)) {
            chain_dropdown.classList.remove("open");
            input_chain_search.value = getChainLabel(input_chainid.value) || input_chain_search.value;
        }
    });

    openContractModalBtn?.addEventListener("click", () => {
        renderContractsModalList();
        setModalVisibility(true);
    });

    closeContractModalBtn.addEventListener("click", () => setModalVisibility(false));
    contractModal.addEventListener("click", (event) => {
        if (event.target === contractModal) {
            setModalVisibility(false);
        }
    });

    contractModalList.addEventListener("click", (event) => {
        const selectBtn = event.target.closest(".contract-select-btn");
        const removeBtn = event.target.closest(".contract-remove-btn");

        if (selectBtn) {
            const cAddress = selectBtn.dataset.address;
            const { data, contractsArray } = localLevel;

            setSelectedLevel({
                contractaddress: cAddress,
                abi: JSON.parse(data?.[cAddress]?.abi),
                savename: data?.[cAddress]?.savename,
                chainid: data?.[cAddress]?.chainid
            });
            setDataToLocalStorage("index", contractsArray?.indexOf(cAddress));
            reloadWindow();
            return;
        }

        if (removeBtn) {
            const cAddress = removeBtn.dataset.address;
            const isYes = confirm("Are you sure, you want to remove?");
            if (!isYes || !cAddress) {
                return;
            }

            let { contractsArray, data } = localLevel;
            const getSelectedIndex = getDataFromLocalStorage("index");
            if (getSelectedIndex == contractsArray?.indexOf(cAddress)) {
                setDataToLocalStorage("index", contractsArray?.length - 1);
            }

            delete data[cAddress];
            contractsArray = contractsArray.filter(contract => contract !== cAddress);
            setDataToLocalStorage("contracts", JSON.stringify(contractsArray));
            setDataToLocalStorage("data", JSON.stringify(data));
            reloadWindow();
        }
    });

    editbtn.addEventListener("click", (event) => {
        event.preventDefault();

        input_contractaddress.disabled = false;
        input_abi.disabled = false;
        input_savename.disabled = false;
        input_chainid.disabled = false;
        input_chain_search.disabled = false;

        formbtn.style.display = "inline-block";
        editbtn.style.display = "none";
    });

    addnewbtn.addEventListener("click", (event) => {
        event.preventDefault();

        input_contractaddress.disabled = false;
        input_contractaddress.value = "";

        input_abi.disabled = false;
        input_abi.value = "";

        input_savename.disabled = false;
        input_savename.value = "";

        input_chainid.disabled = false;
        input_chainid.value = "";
        input_chain_search.disabled = false;
        input_chain_search.value = "";
        renderChainOptions("");

        selectedContractInModal = "";
        if (openContractModalBtn) {
            openContractModalBtn.disabled = true;
        }

        formbtn.style.display = "inline-block";
        editbtn.style.display = "none";
        addnewbtn.style.display = "none";
    });

    readbtn.addEventListener("click", (event) => {
        readbtn.disabled = true;
        writebtn.disabled = false;

        readtab.classList.add("activetab");
        writetab.classList.remove("activetab");
    });

    writebtn.addEventListener("click", (event) => {
        writebtn.disabled = true;
        readbtn.disabled = false;

        writetab.classList.add("activetab");
        readtab.classList.remove("activetab");
    });


    web3form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(web3form);
        const _contractaddress = formData.get("contractaddress");
        const _abi = formData.get("abi");
        const _savename = formData.get("savename");
        const _chainid = formData.get("chainid");

        const requiredEmpty = [];

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
            const message = requiredEmpty.length === 1
                ? `${requiredEmpty[0]} is a required field.`
                : `${requiredEmpty.slice(0, -1).join(", ")} and ${requiredEmpty[requiredEmpty.length - 1]} are required fields.`;
            alert(message);
            return;
        }

        try {
            JSON.parse(_abi);
        } catch (_err) {
            alert("ABI must be valid JSON.");
            return;
        }
        const cAddress = selectedLevel.contractaddress || "";
        let { contractsArray, data } = localLevel;

        if (cAddress != "") {
            delete data[cAddress];
            contractsArray = contractsArray.filter(contract => contract !== cAddress);
        }

        data[_contractaddress] = { chainid: _chainid, savename: _savename, contractaddress: _contractaddress, abi: _abi };

        if (!contractsArray.includes(_contractaddress)) {
            contractsArray.push(_contractaddress);
        }

        setDataToLocalStorage("contracts", JSON.stringify(contractsArray));
        setDataToLocalStorage("data", JSON.stringify(data));
        setDataToLocalStorage("index", contractsArray.indexOf(_contractaddress));
        reloadWindow();
    });

    connectwalletBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        modal.open()
    });

    walletSwitchBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        await requestSwitchToSelectedChain();
        await connect();
    });

    await getFromLocalStorage();
    input_chain_search.value = getChainLabel(input_chainid.value);
});

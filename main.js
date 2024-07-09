import './style.css'
import { connect, getDataFromLocalStorage, reloadWindow, setDataToLocalStorage, settingWeb3 } from "./script";

const selectedLevel = {
    abi: null,
    contractaddress: null,
    rpc: null,
    savename: null,
    chainid: null
}

const localLevel = {
    data: null,
    contractsArray: null
}

const getFromLocalStorage = async () => {
    const contract_list = document.querySelector("#contract_list");
    const deletecontract = document.querySelector("#delete_contract");

    const getData = getDataFromLocalStorage("data");
    const getContractsArray = getDataFromLocalStorage("contracts");
    const getSelectedIndex = getDataFromLocalStorage("index");

    const data = getData ? JSON.parse(getData) : {};
    const contractsArray = getContractsArray ? JSON.parse(getContractsArray) : [];
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

    localLevel.data = data;
    localLevel.contractsArray = contractsArray;

    const contractaddress = contractsArray.length > 0 ? contractsArray[getSelectedIndex || 0] : "";
    const abi = data?.[contractaddress] ? JSON.parse(data[contractaddress]?.abi) : "";
    const rpc = data?.[contractaddress] ? data[contractaddress]?.rpc : "";
    const savename = data?.[contractaddress] ? data[contractaddress]?.savename : "";
    const chainid = data?.[contractaddress] ? data[contractaddress]?.chainid : "";

    selectedLevel.contractaddress = contractaddress;
    selectedLevel.abi = abi;
    selectedLevel.rpc = rpc;
    selectedLevel.savename = savename;
    selectedLevel.chainid = chainid;
    
    contract_list.value = contractaddress;

    await settingWeb3(selectedLevel);
}

window.addEventListener('load', async () => {
    const connectwalletBtn = document.querySelector("#connectwallet");
    const web3form = document.querySelector("#web3details");
    const contract_list = document.querySelector("#contract_list");
    const deletecontract = document.querySelector("#delete_contract");

    contract_list.addEventListener("change", (event) => {
        event.preventDefault();
        const cAddress = event.target.value;
        const { data, contractsArray } = localLevel;

        selectedLevel.contractaddress = cAddress;
        selectedLevel.abi = JSON.parse(data?.[cAddress]?.abi);
        selectedLevel.rpc = data?.[cAddress]?.rpc;
        selectedLevel.savename = data?.[cAddress]?.savename;
        selectedLevel.chainid = data?.[cAddress]?.chainid;

        setDataToLocalStorage("index", contractsArray?.indexOf(cAddress));
        reloadWindow();
    });

    deletecontract.addEventListener("click", (event) => {
        event.preventDefault();
        const { contractaddress } = selectedLevel;
        if (!contractaddress) {
            return;
        }

        const { contractsArray, data } = localLevel;

        const getSelectedIndex = getDataFromLocalStorage("index");
        if (getSelectedIndex == contractsArray?.indexOf(contractaddress)) {
            setDataToLocalStorage("index", contractsArray?.length - 1);
        }

        delete data[contractaddress];
        contractsArray = contractsArray.filter(contract => contract !== cAddress);
        setDataToLocalStorage("contracts", JSON.stringify(contractsArray));
        setDataToLocalStorage("data", JSON.stringify(data));
        reloadWindow();
    });

    web3form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(web3form);
        const _rpc = formData.get("web3rpc");
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
            if (requiredEmpty.length > 1) {
                requiredEmpty.push(requiredEmpty[requiredEmpty.length - 1]);
                requiredEmpty[requiredEmpty.length - 2] = "and";
            }

            alert(`${requiredEmpty.join(", ")} are required fields.`);
            return;
        }

        const { contractsArray, data } = localLevel;

        data[_contractaddress] = { chainid: _chainid, savename: _savename, rpc: _rpc, contractaddress: _contractaddress, abi: _abi };

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
        const {abi, chainid} = selectedLevel;
        await connect(abi, chainid);
    });

    await getFromLocalStorage();
});
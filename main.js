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
    const select_contract = document.querySelector("#select_contract");

    const getData = getDataFromLocalStorage("data");
    const getContractsArray = getDataFromLocalStorage("contracts");
    const getSelectedIndex = getDataFromLocalStorage("index");

    const data = getData ? JSON.parse(getData) : {};
    const contractsArray = getContractsArray ? JSON.parse(getContractsArray) : [];
    contract_list.innerHTML = "";
    if (contractsArray?.length > 0) {
        contract_list.innerHTML += `<option disabled value="">Select Contract</option>`;
        contractsArray.forEach((contract) => {
            const name = data[contract]?.savename || "Unknown Name";
            const chain = data[contract]?.chainid || "Unknown Chain";
            contract_list.innerHTML += `<option value=${contract}>(${name}) (Chain ID: ${chain}) ${contract}</option>`;
        })
        deletecontract.style.display = "inline-block";
        select_contract.style.display = "inline-block";
    } else {
        contract_list.innerHTML += `<option disabled value="">No Saved Contracts</option>`;
    }

    localLevel.data = data;
    localLevel.contractsArray = contractsArray;

    let index = getSelectedIndex;
    if (index >= contractsArray.length && contractsArray.length > 0) {
        setDataToLocalStorage("index", contractsArray.length - 1);
        index = contractsArray.length - 1;
    }

    const contractaddress = contractsArray.length > 0 ? contractsArray[index || 0] : "";
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

    if (contractaddress != "") {
        const input_web3rpc = document.getElementById("web3rpc");
        const input_contractaddress = document.getElementById("contractaddress");
        const input_abi = document.getElementById("abi");
        const input_savename = document.getElementById("savename");
        const input_chainid = document.getElementById("chainid");
        const editbtn = document.querySelector("#editbtn");
        const formbtn = document.querySelector("#formbtn");

        input_web3rpc.disabled = true;
        input_contractaddress.disabled = true;
        input_abi.disabled = true;
        input_savename.disabled = true;
        input_chainid.disabled = true;

        formbtn.style.display = "none";
        editbtn.style.display = "inline-block";
    }

    await settingWeb3(selectedLevel);
}

window.addEventListener('load', async () => {
    const connectwalletBtn = document.querySelector("#connectwallet");
    const web3form = document.querySelector("#web3details");
    const contract_list = document.querySelector("#contract_list");
    const select_contract = document.querySelector("#select_contract");
    const deletecontract = document.querySelector("#delete_contract");
    const formbtn = document.querySelector("#formbtn");
    const editbtn = document.querySelector("#editbtn");
    const addnewbtn = document.querySelector("#addnewbtn");

    // FORM FIELDS
    const input_web3rpc = document.getElementById("web3rpc");
    const input_contractaddress = document.getElementById("contractaddress");
    const input_abi = document.getElementById("abi");
    const input_savename = document.getElementById("savename");
    const input_chainid = document.getElementById("chainid");

    contract_list.addEventListener("change", (event) => {
        event.preventDefault();
        
        const cAddress = event.target.value;
        const index = getDataFromLocalStorage("index");
        const { contractsArray } = localLevel;

        if(cAddress != "" && cAddress != contractsArray?.[index]) {
            select_contract.disabled = false;
        } else {
            select_contract.disabled = true;
        }
        deletecontract.disabled = false;
    })

    select_contract.addEventListener("click", (event) => {
        event.preventDefault();

        const cAddress = contract_list.value;
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

        const isYes = confirm("Are you sure, you want to remove?");

        if(!isYes) {
            return;
        }

        const { contractaddress } = selectedLevel;
        if (!contractaddress) {
            return;
        }

        let { contractsArray, data } = localLevel;

        const getSelectedIndex = getDataFromLocalStorage("index");
        if (getSelectedIndex == contractsArray?.indexOf(contractaddress)) {
            setDataToLocalStorage("index", contractsArray?.length - 1);
        }

        delete data[contractaddress];
        contractsArray = contractsArray.filter(contract => contract !== contractaddress);
        setDataToLocalStorage("contracts", JSON.stringify(contractsArray));
        setDataToLocalStorage("data", JSON.stringify(data));
        reloadWindow();
    });

    editbtn.addEventListener("click", (event) => {
        event.preventDefault();

        input_web3rpc.disabled = false;
        input_contractaddress.disabled = false;
        input_abi.disabled = false;
        input_savename.disabled = false;
        input_chainid.disabled = false;

        formbtn.style.display = "inline-block";
        editbtn.style.display = "none";
    });

    addnewbtn.addEventListener("click", (event) => {
        event.preventDefault();

        input_web3rpc.disabled = false;
        input_web3rpc.value = "";

        input_contractaddress.disabled = false;
        input_contractaddress.value = "";

        input_abi.disabled = false;
        input_abi.value = "";

        input_savename.disabled = false;
        input_savename.value = "";

        input_chainid.disabled = false;
        input_chainid.value = "";

        contract_list.value = "";

        select_contract.disabled = true;
        deletecontract.disabled = true;

        formbtn.style.display = "inline-block";
        editbtn.style.display = "none";
        addnewbtn.style.display = "none";
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
        const cAddress = contract_list.value;
        let { contractsArray, data } = localLevel;

        if (cAddress != "") {
            delete data[cAddress];
            contractsArray = contractsArray.filter(contract => contract !== cAddress);
        }

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
        const { abi, chainid } = selectedLevel;
        await connect(abi, chainid);
    });

    await getFromLocalStorage();

    document.querySelector("#load").style.display = "none";
    document.querySelector("body").style.overflow = "auto";
});
const web3Divide = (val, b) => {
    if (b < 2) {
        return val;
    }
    let a = val.toString();
    let chkDec = a.split(".");
    if (chkDec.length > 1) {
        a = chkDec[0];
    }
    let len = a.length;
    let i = 0;
    while (i < b) {
        len = len - 1;
        i++;
    }
    let v1 = a.substring(0, len);
    let v2 = a.substring(len, a.length);
    if (len <= 0) {
        let point = len * -1;
        v1 = "0.";
        i = 0;
        while (i < point) {
            v1 += "0";
            i++;
        }
    } else if (Number(v2) !== 0) {
        v1 = v1 + ".";
    }
    v2 = v2.split("");
    while (true) {
        if (v2[v2.length - 1] !== "0") {
            break;
        }
        v2.pop();
    }
    v2 = v2.join("");
    return v1 + v2;
};

const web3Multiply = (val, b) => {
    if (b < 2) {
        return val;
    }
    const a = val.toString();
    let v1 = a.split(".");
    let len = v1.length > 1 ? b - v1[1].length : b;
    let i = 0;
    if (len > 0) {
        while (i < len) {
            v1.push("0");
            i++;
        }
    } else if (len < 0) {
        let v1_2 = v1[1].split("");
        while (i > len) {
            v1_2.pop();
            i--;
        }
        v1[1] = v1_2.join("");
    }

    v1 = v1.join("");
    const v2 = v1.split("");
    while (true) {
        if (v2[0] == "0") {
            v2.shift();
            i++;
        } else {
            break;
        }
    }
    return v2.join("");
};

export const web3Number = (number, isBigToSmall = true, dec = 18, isLocale = null) => {
    if (Number(number) === 0 || isNaN(Number(number))) {
        return 0;
    }
    let num = number;
    if (typeof number == "number" || typeof number == "bigint") {
        num = num.toString();
    }
    if (num.includes("+") || num.includes("-")) {
        if (num.indexOf("+") != -1) {
            num = Number(num).toLocaleString().replaceAll(",", "");
        } else {
            const splitNum = num.split("-");
            const exponentNum = splitNum[splitNum.length - 1];
            const numLen = splitNum[0].length - 1;
            num = Number(num).toFixed(Number(exponentNum) + Number(numLen));
        }
    }

    if (isBigToSmall) {
        num = web3Divide(num, dec);
    } else {
        num = web3Multiply(num, dec);
    }
    if (isLocale) {
        num = numLocale(num);
    }
    return num;
};

export const numLocale = (num) => {
    return Number(num).toLocaleString();
}
import * as allNetworks from '@reown/appkit/networks'
import chainsJson from "./chains.json"

export const chains = () => {
    return chainsJson
        .map((key) => allNetworks[key])
        .filter((network) => Boolean(network))
}
export const getChainById = (chainId) => {
    const key = chainsJson.find((v) => allNetworks[v] && Number(allNetworks[v].id) === Number(chainId));
    return allNetworks?.[key]
}

export const getChainByName = (name) => {
    const key = chainsJson.find((v) => allNetworks[v] && allNetworks[v].name === name)
    return allNetworks?.[key]
}

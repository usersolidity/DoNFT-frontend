import {ethers} from "ethers";
import {abi as ERC721_CONTRACT_ABI} from "../contracts/ERC721.json";
import {abi as BUNDLE_CONTRACT_ABI} from "../contracts/BundleNFT.json"
import detectEthereumProvider from '@metamask/detect-provider';

import untar from "js-untar"
import {getNftInfosByAddress} from "../api";
import axios from "axios";
import {Status} from "../store";

const BUNDLE_CONTRACT_ADDRESS = process.env.VUE_APP_BUNDLE_CONTRACT_ADDRESS

export async function detectWeb3Providers () {
    let provider = null
    try {
        let web3provider = await detectEthereumProvider()
        provider = new ethers.providers.Web3Provider(web3provider, "any")
    } catch (e) {
        console.log(e)
    }
    return provider
}

export async function getAccountBalance(provider, accountAddress) {
    return await provider.getBalance(accountAddress)
}

export async function unconnectWeb3Provider() {
    let provider = null
    try {
        let web3provider = await detectEthereumProvider()
        provider = new ethers.providers.Web3Provider(web3provider, "any")
        await provider.close();
        provider = null;
    } catch (e) {
        console.log(e)
    }
}
// if (provider) {
//     startApp(provider); // Initialize your app
// } else {
//     console.log('Please install MetaMask!');
// }

// function startApp(provider) {
//     // If the provider returned by detectEthereumProvider is not the same as
//     // window.ethereum, something is overwriting it, perhaps another wallet.
//     if (provider !== window.ethereum) {
//         console.error('Do you have multiple wallets installed?');
//     }
//     // Access the decentralized web!
// }

/**********************************************************/
/* Handle chain (network) and chainChanged (per EIP-1193) */
/**********************************************************/

// const chainId = await ethereum.request({ method: 'eth_chainId' });
// handleChainChanged(chainId);

// ethereum.on('chainChanged', handleChainChanged);

// function handleChainChanged(_chainId) {
//     // We recommend reloading the page, unless you must do otherwise
//     window.location.reload();
// }

/***********************************************************/
/* Handle user accounts and accountsChanged (per EIP-1193) */
/***********************************************************/

// let currentAccount = null;
// ethereum
//     .request({ method: 'eth_accounts' })
//     .then(handleAccountsChanged)
//     .catch((err) => {
//         // Some unexpected error.
//         // For backwards compatibility reasons, if no accounts are available,
//         // eth_accounts will return an empty array.
//         console.error(err);
//     });

// Note that this event is emitted on page load.
// If the array of accounts is non-empty, you're already
// connected.
// ethereum.on('accountsChanged', handleAccountsChanged);

// For now, 'eth_accounts' will continue to always return an array
// function handleAccountsChanged(accounts) {
//     if (accounts.length === 0) {
//         // MetaMask is locked or the user has not connected any accounts
//         console.log('Please connect to MetaMask.');
//     } else if (accounts[0] !== currentAccount) {
//         currentAccount = accounts[0];
//         // Do any other work!
//     }
// }

/*********************************************/
/* Access the user's accounts (per EIP-1102) */
/*********************************************/

// You should only attempt to request the user's accounts in response to user
// interaction, such as a button click.
// Otherwise, you popup-spam the user like it's 1999.
// If you fail to retrieve the user's account(s), you should encourage the user
// to initiate the attempt.
// document.getElementById('connectButton', connect);

// While you are awaiting the call to eth_requestAccounts, you should disable
// any buttons the user can click to initiate the request.
// MetaMask will reject any additional requests while the first is still
// pending.
async function connectToMetamask(metamaskProvider) {
    let result;
    try {
        result = (await metamaskProvider.send("eth_requestAccounts"))[0]
        let address = await metamaskProvider.getSigner().getAddress()
        return address
    } catch (err) {
        if (err.code === 4001) {
            // EIP-1193 userRejectedRequest error
            // If this happens, the user rejected the connection request.
            console.log('Please connect to MetaMask.');
            result = null
        } else {
            console.error(err);
            result = null
        }
    }
    return result
}

export function getNFTContract(provider, contractAddress) {
    const signer = provider.getSigner()
    return new ethers.Contract(contractAddress, ERC721_CONTRACT_ABI, signer)
}

function getBundleContract(provider) {
    const signer = provider.getSigner()
    return new ethers.Contract(BUNDLE_CONTRACT_ADDRESS, BUNDLE_CONTRACT_ABI, signer)
}

export async function mintNFT({state, dispatch}, tokenAddress, tokenId, tokenURI) {
    const bundleContract = getBundleContract(state.ethersProvider)
    console.log(tokenAddress, tokenId, tokenURI)
    let isApproved = await checkApproval(state.ethersProvider, tokenAddress)
    if (!isApproved) {
        try {
            let tx = await approveForAll(state.ethersProvider, tokenAddress)
            //wait for mining tx
            console.log(tx)
            dispatch('setStatus', Status.Approving)
            state.ethersProvider.once(tx.hash, async () => {
                dispatch('setStatus', Status.Minting)
                return await bundleContract.bundleWithTokenURI([{token: tokenAddress, tokenId}], tokenURI)
            })
        } catch (e) {
            dispatch('setStatus', Status.Cancelled)
            console.log(e)
            return
        }
    }
    dispatch('setStatus', Status.Minting)
    return await bundleContract.bundleWithTokenURI([{token: tokenAddress, tokenId}], tokenURI)
}

export async function wrapNFTS(provider, ipfsInstance, tokens) {
    const bundleContract = getBundleContract(provider)
    let tokenCID = await pushObjectToIpfs(ipfsInstance, generateBundleMeta(Date.now().toString()))
    return await bundleContract.bundleWithTokenURI(tokens, `ipfs://${tokenCID}`)
}

function generateBundleMeta(name) {
    return {
        name,
        description: 'NFT bundeled with DoNFT.io',
        image: process.env.VUE_APP_BUNDLE_IMAGE
    }
}

export async function checkApproval(provider, contractAddress) {
    const nftContract = getNFTContract(provider, contractAddress)
    return await nftContract.isApprovedForAll(await provider.getSigner().getAddress(), BUNDLE_CONTRACT_ADDRESS)
}

export async function approveForAll(provider, contractAddress) {
    const nftContract = getNFTContract(provider, contractAddress)
    return await nftContract.setApprovalForAll(BUNDLE_CONTRACT_ADDRESS, true)
}

export async function listBundledTokenIds(provider, bundleId) {
    const bundleContract = getBundleContract(provider, BUNDLE_CONTRACT_ADDRESS)
    return await bundleContract.bundeledTokensOf(bundleId)
}

export async function unwrap(provider, bundleId) {
    const bundleContract = getBundleContract(provider, BUNDLE_CONTRACT_ADDRESS)
    return await bundleContract.unbundle(bundleId)
}

export async function listTokensOfOwner(contract, account) {
    const sentLogs = await contract.queryFilter(
        contract.filters.Transfer(account, null),
    )
    const receivedLogs = await contract.queryFilter(
        contract.filters.Transfer(null, account),
    )
    const logs = sentLogs.concat(receivedLogs)
        .sort(
            (a, b) =>
                a.blockNumber - b.blockNumber ||
                a.transactionIndex - b.transactionIndex,
        )
    let owned = new Set()

    for (const log of logs) {
        const {from, to, tokenId} = log.args

        if (to === account) {
            owned.add(tokenId.toString())
        } else if (from === account) {
            owned.delete(tokenId.toString())
        }
    }
    owned = Array.from(owned)
    return owned.map(id => ({id, meta: null}))
}

export async function listTokensOfOwnerRarible(ownerAddress) {
    let result = await axios.get(process.env.VUE_APP_RARIBLE_URL + '/nft/items/byOwner', {
        params: {
            owner: ownerAddress
        }
    })
    let tokens = result.data.items.filter(x => x.contract !== process.env.VUE_APP_BUNDLE_CONTRACT_ADDRESS.toLowerCase()).map(x => ({id: x.tokenId, contractAddress: x.contract}))
    console.log(tokens)
    return tokens
}

export async function getMetadataURIForToken (provider, contractAddress, tokenId) {
    let contract
    if (contractAddress === process.env.VUE_APP_BUNDLE_CONTRACT_ADDRESS) {
        contract = getBundleContract(provider)
    } else {
        contract = getNFTContract(provider, contractAddress)
    }
    let res = await contract.tokenURI(tokenId)
    return res
}

const CID_RE = /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/m

export async function getMetadataForTokenByURI (ipfsInstance, uri) {
    let meta
    if (uri.startsWith('http')) {
        try {
            let response = await axios.get(uri, {
                headers: {'accept': 'text/plain'}
            })
            if (response.headers['content-type'].indexOf('application/json') !== -1 && response.data) {
                meta = response.data
            }
        } catch (e) {
            console.log(e)
            meta = null
        }

    } else if (uri.startsWith('ipfs')) {
        let cid = CID_RE.exec(uri)?.[0]
        let data = await getMetaFromIpfs(ipfsInstance, cid)
        if (data.length !== 0) {
            meta = data
        }
    }
    return meta
}

export async function getImageForTokenByURI(ipfsInstance, imageAddress) {
    let image
    if (imageAddress) {
        if (imageAddress.startsWith('http')) {
            image = imageAddress

        } else if (imageAddress.startsWith('ipfs')) {
            let cid = CID_RE.exec(imageAddress)?.[0]
            let localImageURL = await getImageFromIpfs(ipfsInstance, cid)
            image = localImageURL
        }
    }
    return image
}

async function getImageFromIpfs(ipfsInstance, cid) {
    let blob = null
    try {
        blob = await loadFileFromIPFS(ipfsInstance, cid, 6000)
    } catch (e) {
        console.log(e)
    }
    return blob ? URL.createObjectURL(blob) : null
}

async function getMetaFromIpfs(ipfsInstance, cid) {
    let blob = null
    try {
        blob = await loadFileFromIPFS(ipfsInstance, cid, 10000)
    } catch (e) {
        console.log(e)
    }
    let res = {}
    if (blob) {
        try {
            let blobText = await blob.text()
            res = JSON.parse(blobText)
        } catch (e) {
            console.log(e)
        }
    }

    return res;
}

async function loadFileFromIPFS(ipfs, cid, timeout) {
    if (cid === "" || cid === null || cid === undefined) {
        return;
    }
    let content = []
    for await (const buff of ipfs.get(cid, {timeout})) {
        if (buff) {
            content.push(buff)
        }
    }
    let archivedBlob = new Blob(content, {type: "application/x-tar"})
    let archiveArrayBuffer = await archivedBlob.arrayBuffer()
    let archive = (await untar(archiveArrayBuffer))?.[0]

    return archive.blob
}

export async function pushImageToIpfs(ipfsInstance, objectURL) {
    let blob = await fetch(objectURL).then(r => r.blob())
    let cid = await ipfsInstance.add(blob)
    console.log(cid)
    return cid.path
}

export async function pushObjectToIpfs(ipfsInstance, object) {
    let cid = await ipfsInstance.add(JSON.stringify(object))
    console.log(cid)
    return cid.path
}

export async function deployNFTtoIPFS(ipfsInstance, imageURL, oldMeta) {
    let imageCID = await pushImageToIpfs(ipfsInstance, imageURL)
    let meta = JSON.parse(JSON.stringify(oldMeta))
    meta.animation_url = `ipfs://${imageCID}`
    let newMetaCID = await pushObjectToIpfs(ipfsInstance, meta)
    return `ipfs://${newMetaCID}`
}

function getImageUri(object) {
    return object?.image || object?.image_url || object?.image_uri
}

export async function resolveNFTinfos(ipfsInstance, accountAddress) {
    let nftAddresses = await getNftInfosByAddress(accountAddress)
    let nftInfos = []
    for (let nftAddress of nftAddresses.filter(x => x)) {
        let nftInfo = {
            id: nftAddress.identifier,
            image: null,
            description: 'Not provided',
            name: 'Unknown',
            isModifiable: false
        }
        if (nftAddress?.uri && nftAddress.uri !== '') {
            console.log(nftAddress.uri)
            let imageAddress
            let meta
            if (nftAddress.uri.startsWith('http')) {
                try {
                    let response = await axios.get(nftAddress.uri, {
                        headers: {'accept': 'text/plain'}
                    })
                    if (response.headers['content-type'].indexOf('application/json') !== -1 && response.data) {
                        meta = response.data
                    }
                } catch (e) {
                    console.log(e)
                    meta = null
                }

            } else if (nftAddress.uri.startsWith('ipfs')) {
                let cid = CID_RE.exec(nftAddress.uri)?.[0]
                let data = await getMetaFromIpfs(ipfsInstance, cid)
                if (data.length !== 0) {
                    meta = data
                }
            }
            if (meta) {
                if (Object.prototype.hasOwnProperty.call(meta, "name")) {
                    nftInfo.name = meta.name
                }
                if (Object.prototype.hasOwnProperty.call(meta, "description")) {
                    nftInfo.description = meta.description
                }
                imageAddress = getImageUri(meta)
                if (imageAddress) {
                    if (imageAddress.startsWith('http')) {
                        nftInfo.image = imageAddress

                    } else if (imageAddress.startsWith('ipfs')) {
                        let cid = CID_RE.exec(imageAddress)?.[0]
                        let localImageURL = await getImageFromIpfs(ipfsInstance, cid)
                        nftInfo.image = localImageURL
                    }
                }
            }
        }
        nftInfos.push(nftInfo)
    }
    return nftInfos
}

export async function checkNet(ethersProvider) {
    let currentNet = await ethersProvider.getNetwork()
    return currentNet.name !== process.env.VUE_APP_NET_NAME
}

export async function sendWrappedTokenTo(provider, fromAddress, toAddress, tokenId) {
    const bundleContract = getBundleContract(provider, BUNDLE_CONTRACT_ADDRESS)
    return await bundleContract.transferFrom(fromAddress, toAddress, tokenId)
}

export {connectToMetamask}
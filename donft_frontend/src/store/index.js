import Vue from 'vue'
import Vuex from 'vuex'
import {
    connectToMetamask,
    deployNFTtoIPFS,
    getAccountBalance,
    listTokensOfOwner,
    mintNFT,
    getMetadataURIForToken,
    getMetadataForTokenByURI,
    getImageForTokenByURI,
    getNFTContract,
    listBundledTokenIds, 
    listTokensOfOwnerRarible,
    unconnectWeb3Provider
} from "../ethereum_utils";
import {getEffects, modifyPicture} from "../api";
import {BigNumber, ethers} from "ethers";
import * as IPFS from "ipfs-core";
import {getImageURLFromObject} from "../utilities";
import {NETWORK, NETWORKS} from "../constants";

Vue.use(Vuex)

export const Status = Object.freeze({
    Error: -3,
    Cancelled: -2,
    ChoosingParameters: -1,
    Applying: 0,
    Approving: 1,
    DeployingToIPFS: 2,
    DeployedToIPFS: 3,
    Minting: 4,
    Minted: 5
})

function setTokenProperty (state, contractAddress, tokenId, tokenPropName, value) {
    let nftPoolExistsAtIndex = state.nfts.findIndex(x => x.contractAddress === contractAddress)
    if (nftPoolExistsAtIndex !== -1) {
        let nftPool = state.nfts[nftPoolExistsAtIndex]
        let nftExistsAtIndex = nftPool.tokens.findIndex(x => x.id === tokenId)
        if (nftExistsAtIndex !== -1) {
            let nft = nftPool.tokens[nftExistsAtIndex]
            Vue.set(nft, tokenPropName, value)
        }
    }
}


const store = new Vuex.Store({
    state: {
        ipfs: null,
        ethersProvider: null,
        accountAddress: null,
        accountBalance: null,
        networkName: null,
        contractAddresses: [],
        currentContractAddress: null,
        bundleContractAddress: null,
        nfts: [],
        nftChoice: [],
        nftLoading: false,
        effects: [],
        effectChoice: null,
        deployedPictureMeta: null,
        nftTransactionHash: null,
        globalLoading: false,
        result: null,
        status: Status.ChoosingParameters,
        web3modal: null,
        active: false,
    },
    mutations: {
        setIpfs (state, ipfsInstance) {
            state.ipfs = ipfsInstance
        },
        setAccountAddress (state, accountAddress) {
            state.accountAddress = accountAddress
        },
        SET_BUNDLE_CONTRACT_ADDRESS (state, address) {
            state.bundleContractAddress = address
        },
        SET_CURRENT_CONTRACT_ADDRESS (state, address) {
            state.currentContractAddress = address
        },
        SET_NFTS_BY_CONTRACT (state, {nfts, contractAddress}) {
            let existsAtIndex  = state.nfts.findIndex(x => x.contractAddress === contractAddress)
            if (existsAtIndex !== -1) {
                let nftPool = state.nfts[existsAtIndex]
                for (let nft of nfts) {
                    let tokenExistsAt = nftPool.tokens.findIndex(x => x.id === nft.id)
                    if (tokenExistsAt === -1) {
                        nftPool.tokens.push(nft)
                    }
                }
                for (const [idx, existingToken] of Object.entries(nftPool.tokens)) {
                    let newTokenExistsAt = nfts.findIndex(x => x.id === existingToken.id)
                    if (newTokenExistsAt === -1) {
                        nftPool.tokens.splice(idx, 1)
                    }
                }
                state.nfts[existsAtIndex] = nftPool
            } else {
                state.nfts.push({contractAddress, tokens: nfts, choices: []})
            }
            state.nfts = [...state.nfts]
        },
        UNSET_ALL_NFT_CHOICES_EXCEPT_CONTRACT (state, {contractAddress}) {
            let allExcept  = state.nfts.filter(x => x.contractAddress !== contractAddress)
            for (const tokenPool of allExcept) {
                tokenPool.choices = []
            }
            state.nfts = [...state.nfts]
        },
        UNSET_ALL_NFTS_EXCEPT_BUNDLED (state) {
            let onlyBundled  = state.nfts.filter(x => x.contractAddress === state.bundleContractAddress)
            state.nfts = [...onlyBundled]
        },
        UNSET_ALL_NFTS (state) {
            state.nfts = []
        },
        SET_NFT_CHOICES_BY_CONTRACT (state, {choices, contractAddress}) {
            let existsAtIndex  = state.nfts.findIndex(x => x.contractAddress === contractAddress)
            if (existsAtIndex !== -1) {
                state.nfts[existsAtIndex].choices = choices
            }
            state.nfts = [...state.nfts]
        },
        SET_TOKEN_URI (state, {contractAddress, tokenId, tokenURI}) {
            setTokenProperty(state, contractAddress, tokenId, 'uri', tokenURI)
        },
        SET_TOKEN_META (state, {contractAddress, tokenId, tokenMETA}) {
            setTokenProperty(state, contractAddress, tokenId, 'meta', tokenMETA)
        },
        SET_TOKEN_IMAGE (state, {contractAddress, tokenId, tokenImage}) {
            setTokenProperty(state, contractAddress, tokenId, 'localImage', tokenImage)
        },
        SET_WEB3_MODAL (state, web3modal) {
            state.web3modal = web3modal
        },
        SET_ACTIVE (state, active) {
          state.active = active
        },
        setEthersProvider (state, ether) {
            state.ethersProvider = ether
        },
        setEffects (state, effects) {
            state.effects = effects
        },
        setEffectChoice(state, choice) {
            state.effectChoice = choice
        },
        setAccountBalance(state, balance) {
            state.accountBalance = balance
        },
        setResult (state, blob) {
            state.result = blob
        },
        setDeployedPictureMeta (state, meta) {
            state.deployedPictureMeta = meta
        },
        setNFThash (state, transactionHash) {
            state.nftTransactionHash = transactionHash
        },
        setStatus (state, status) {
            state.status = status
        },
        setNetwork (state, networkName) {
            state.networkName = networkName
        },
        setNFTsLoading (state, isLoading) {
            state.nftLoading = isLoading
        },
        setWrappedNFTsLoading (state, isLoading) {
            state.wrappedNftLoading = isLoading
        }
    },
    actions: {
        async setIpfs ({commit}) {
            commit('setIpfs', await IPFS.create())
        },
        async setWeb3EhereumProvider ({state, commit, dispatch}) {
            const provider = await state.web3modal.connect();

            const library = new ethers.providers.Web3Provider(provider, 'any')

            library.pollingInterval = 12000
            commit('setEthersProvider', library)

            const accounts = await library.listAccounts()
            if (accounts.length > 0) {
                commit('setAccountAddress', accounts[0])
            }
            const network = await library.getNetwork()
            commit('setNetwork', network.chainId)
            commit('SET_ACTIVE', true)

            commit('SET_BUNDLE_CONTRACT_ADDRESS', NETWORK(network.chainId).bundleContractAddress)

            provider.on("connect", async (info) => {
                // let chainId = parseInt(info.chainId)
                commit('setNetwork', info.chainId)
                console.log("connect", info)
            });

            provider.on("accountsChanged", async (accounts) => {
                if (accounts.length > 0) {
                    commit('setAccountAddress', accounts[0])
                } else {
                    await dispatch('resetApp')
                }
                console.log("accountsChanged")
            });
            provider.on("chainChanged", async (chainId) => {
                chainId = parseInt(chainId)
                commit('setChainId', chainId)
                console.log("chainChanged", chainId)
            });
        },
        async resetApp({state, commit}) {
            try {
                await state.web3modal.clearCachedProvider();
            } catch (error) {
                console.error(error)
            }
            commit('setAccountAddress', null)
            commit('setActive', false)
            commit('setEthersProvider', null)
        },
        async setEmptyWeb3rovider ({commit}) {
            await unconnectWeb3Provider()
            commit('setEthersProvider', null)
        },
        async setAccount ({commit, dispatch, state}) {
            commit('setAccountAddress', await connectToMetamask(state.ethersProvider))
            await dispatch('setNFTS', {contractAddress: state.bundleContractAddress})
        },
        async setNFTS ({commit, state}, {contractAddress}) {
            let contract = getNFTContract(state.ethersProvider, contractAddress)
            commit('SET_NFTS_BY_CONTRACT', {nfts: await listTokensOfOwner(contract, state.accountAddress), contractAddress})
        },
        async setWrappedTokenIds ({commit, state}, {bundleId}) {
            let tokens = await listBundledTokenIds(state.ethersProvider, bundleId, state.bundleContractAddress)
            let aggregation = {}
            for (const nft of tokens) {
                if (!Object.prototype.hasOwnProperty.call(aggregation, nft.token)) {
                    aggregation[nft.token] = [{id: nft.tokenId.toNumber(), meta: null}]
                } else {
                    aggregation[nft.token].push({id: nft.tokenId.toNumber(), meta: null})
                }
            }
            for (const [contractAddress, nfts] of Object.entries(aggregation)) {
                commit('SET_NFTS_BY_CONTRACT', {nfts, contractAddress})
            }
        },
        async setUserTokenIds ({commit, state}) {
            let tokens = await listTokensOfOwnerRarible(state.bundleContractAddress, state.accountAddress)
            let aggregation = {}
            for (const nft of tokens) {
                if (!Object.prototype.hasOwnProperty.call(aggregation, nft.contractAddress)) {
                    aggregation[nft.contractAddress] = [{id: nft.id, meta: null}]
                } else {
                    aggregation[nft.contractAddress].push({id: nft.id, meta: null})
                }
            }
            for (const [contractAddress, nfts] of Object.entries(aggregation)) {
                commit('SET_NFTS_BY_CONTRACT', {nfts, contractAddress})
            }
        },
        setNFTchoices ({commit}, {contractAddress, choices}) {
            commit('SET_NFT_CHOICES_BY_CONTRACT', {contractAddress, choices})
        },
        clearOtherChoices ({commit}, {contractAddress}) {
            commit('UNSET_ALL_NFT_CHOICES_EXCEPT_CONTRACT', {contractAddress})
        },
        async setTokenURI ({commit, state}, {contractAddress, tokenId}) {
            commit('SET_TOKEN_URI', {
                contractAddress,
                tokenId,
                tokenURI: await getMetadataURIForToken(state.ethersProvider, contractAddress, tokenId, state.bundleContractAddress)
            })
        },
        async setTokenMeta ({commit, getters, state}, {contractAddress, tokenId}) {
            let token = getters.getTokenById(contractAddress, tokenId)
            commit('SET_TOKEN_META', {contractAddress, tokenId, tokenMETA: await getMetadataForTokenByURI(state.ipfs, token.uri)})
        },
        async setTokenImage ({commit, getters, state}, {contractAddress, tokenId}) {
            let token = getters.getTokenById(contractAddress, tokenId)
            commit('SET_TOKEN_IMAGE', {contractAddress, tokenId, tokenImage: await getImageForTokenByURI(state.ipfs, getImageURLFromObject(token.meta))})
        },
        async setEffects ({commit}) {
            commit('setEffects', await getEffects())
        },
        async setBalance ({commit, state}) {
            commit('setAccountBalance', await getAccountBalance(state.ethersProvider, state.accountAddress))
        },
        setEffectChoice ({commit}, choice) {
            commit('setEffectChoice', choice)
        },
        async setResult ({commit, dispatch, getters}) {
            dispatch('setStatus', Status.Applying)
            commit('setResult', await modifyPicture(getters.getNFTforModification.localImage, getters.getEffectChoice))
        },
        async setDeployedPictureMeta ({commit, dispatch, getters}) {
            dispatch('setStatus', Status.DeployingToIPFS)
            commit('setDeployedPictureMeta', await deployNFTtoIPFS(getters.getIpfs, getters.getResult, getters.getNFTforModification.meta))
        },
        setNFTsLoading ({commit}, isLoading) {
            commit('setNFTsLoading', isLoading)
        },
        setWrappedNFTsLoading ({commit}, isLoading) {
            commit('setWrappedNFTsLoading', isLoading)
        },
        async setNFThash ({state, commit, dispatch, getters}) {
            
            try {
                commit('setNFThash', (await mintNFT({state, dispatch}, getters.tokensForWrapping[0].token, getters.tokensForWrapping[0].tokenId,  getters.getDeployedPictureMeta)).hash)
            } catch (e) {
                console.log(e)
                if (e.code === 4001) {
                    dispatch('setStatus', Status.Cancelled)
                } else {
                    dispatch('setStatus', Status.Error)
                }

            }
        },
        setStatus ({commit}, status) {
            commit("setStatus", status)
        },
        setNetwork ({commit}, networkName) {
            commit("setNetwork", networkName)
        },
        setCurrentContractAddress ({commit}, address) {
          commit('SET_CURRENT_CONTRACT_ADDRESS', address)
        },
        async proxyAction({ dispatch }, { actionName, data, setLoading = true , setLoadingAction = ''}) {
            dispatch(setLoadingAction, setLoading, { root: true });
            try {
                const response = await dispatch(actionName, data, { root: true });
                dispatch(setLoadingAction, false, { root: true });
                return response;
            } catch (e) {
                dispatch(setLoadingAction, false, { root: true });
                // this._vm.$toasted.error(BE_API_ERROR_MESSAGE);
                return false;
            }
        },
        removeOtherContracts ({commit}) {
            commit('UNSET_ALL_NFTS_EXCEPT_BUNDLED')
        },
        removeAllNFTS ({commit}) {
            commit('UNSET_ALL_NFTS')
        }
    },
    getters: {
        getEthersProvider: (state) => state.ethersProvider,
        getAccount: (state) => state.accountAddress,
        getNFTChoice: (state) => state.nftChoice,
        getEffects: state => state.effects,
        getEffect: state => state.effects.filter(x => x.id === state.effectChoice)?.[0],
        getEffectChoice: state => state.effectChoice,
        getAccountBalance: state => (BigNumber.from(state.accountBalance || 0) / Math.pow(10, 18)).toFixed(4),
        getIpfs: state => state.ipfs,
        getResult: state => state.result,
        getDeployedPictureMeta: state => state.deployedPictureMeta,
        getStatus: state => state.status,
        getTransactionHash: state => state.nftTransactionHash,
        networkIsCorrect: (state) => {
            for (const network in NETWORKS) {
                if (NETWORKS[network].chainId === state.networkName) return true
            }
            return false
        },
        getNftsAreLoading: state => state.nftLoading,
        getWrappedNftsAreLoading: state => state.wrappedNftLoading,
        getTokenById: (state) => (address, id) => {
            let nftPoolExistsAtIndex = state.nfts.findIndex(x => x.contractAddress === address)
            if (nftPoolExistsAtIndex !== -1) {
                let nftPool = state.nfts[nftPoolExistsAtIndex]
                let nftExistsAtIndex = nftPool.tokens.findIndex(x => x.id === id)
                if (nftExistsAtIndex !== -1) {
                    return nftPool.tokens[nftExistsAtIndex]
                }
            }
        },
        getTokenPoolByContract: (state) => (contractAddress) => {
            let nftPoolExistsAtIndex = state.nfts.findIndex(x => x.contractAddress === contractAddress)
            if (nftPoolExistsAtIndex !== -1) {
                let nftPool = state.nfts[nftPoolExistsAtIndex]
                return nftPool
            }
            return null
        },
        getCurrentContract: (state) => {
            return state.currentContractAddress
        },
        getContractsWithChoices: (state) => {
            return state.nfts.filter(x => x.choices !== [] && x.contractAddress !== state.bundleContractAddress).map(x => x.contractAddress)
        },
        tokensForWrapping: (state) => {
            let tokens = []
            for (const pool of state.nfts.filter(x => x.choices !== [] && x.contractAddress !== state.bundleContractAddress)) {
                for (const tokenId of pool.choices) {
                    tokens.push({token: pool.contractAddress, tokenId: Number(tokenId)})
                }
            }
            return tokens
        },
        contractsExceptWrapped: (state) => {
            return state.nfts.filter(x => x.contractAddress !== state.bundleContractAddress).map(x => x.contractAddress)
        },
        numChoices: (state) => {
            let sum = 0
            for (const nft of state.nfts.filter(x => x.contractAddress !== state.bundleContractAddress)) {
                sum += nft.choices.length
            }
            return sum
        },
        getNFTforModification: (state, getters) => {
            const {token, tokenId} = getters.tokensForWrapping[0]
            return getters.getTokenById(token, String(tokenId))
        },
        getBundleContractAddress: (state) => state.bundleContractAddress
    }
})

export default store
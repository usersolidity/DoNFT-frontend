<template>
  <div class="container-fluid">
    <h1 class="pt-2 text-lilac">Bundle your NFTs</h1>
    <b-row  class="justify-content-end pt-1 padding-div" style="min-height: 42px;" >
          <b-col class="col-2 align-items-center text-center">
            <b-button variant="dark" class="btn mr-2" @click="goToChooseNFT">Back</b-button>
          </b-col>
      </b-row>
    <token-deck card-size="standard"
                justification="justify-content-center" :contract-addresses="contracts" show-chosen-only="true"></token-deck>

    <b-row  class="justify-content-md-center">
        <b-col v-show="statusId === Status.Minting" class="col-1 text-black spinner-border" style="font-size: medium"></b-col>
    </b-row>
    <b-row  class="justify-content-md-center">
        <b-col v-show="statusId > Status.Minting" class="col-3 text-black text-center" style="font-size: large">Successfull bundeled!</b-col>
    </b-row>
    <div class="row text-center align-content-center justify-content-center py-3">
      <div class="col-8">
        <b-button variant="success" v-show="tokenPool.choices && statusId !== Status.Minted" @click="handleWrap"
           class="btn display-5" :class="{disabled: statusId === Status.Minting}">{{ wrapButtonText }} </b-button>
           
        <div v-show="statusId >= Status.Minting && transactionHash" class="container-fluid minting-panel bg-green rounded-16 mt-3">
          <div class="row h-100 align-items-center justify-content-center">
            <div class="col-12 align-self-center">
              <p>View in explorer:</p>
              <ChainBrowserLink css-class="link-gray"
                                :hash="transactionHash"
                                chain-name="ether"
                                :net-name="netName"
                                :short="false"
                                hash-kind="tx"/>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import {mapActions, mapGetters} from "vuex";
import {approveForAll, checkApproval, wrapNFTS} from "../ethereum_utils";
import TokenDeck from "../components/TokenDeck";
import ChainBrowserLink from "../components/ChainBrowserLink";
import {Status} from "../store";

export default {
  name: "WrapNFTS",
  components: {
    ChainBrowserLink,
    TokenDeck
  },
  data () {
    return {
      Status,
      transactionHash: null,
      netName: process.env.VUE_APP_NET_NAME
    }
  },
  methods: {
    ...mapActions(['setStatus']),
    async handleWrap () {
      try {
        for (const contractAddress of this.contracts) {
          let isApproved = await checkApproval(this.provider, contractAddress, this.bundleContractAddress)
          if (!isApproved) {
            try {
              await approveForAll(this.provider, contractAddress, this.bundleContractAddress)
            } catch (e) {
              this.setStatus(this.Status.Cancelled)
              console.log(e)
              return
            }
          }
        }

        this.setStatus(this.Status.Minting)
        try {
          let transactionResult = await wrapNFTS(this.provider, this.ipfs, this.tokensForWrapping, this.bundleContractAddress)
          this.transactionHash = transactionResult.hash
          if (this.transactionHash) {
            this.provider.once(this.transactionHash, (transaction) => {
              console.log(transaction)
              this.setStatus(this.Status.Minted)
            })
          }
        } catch (e) {
          if (e.code === 4001) {
            this.setStatus(Status.Cancelled)
          } else {
            this.setStatus(Status.Error)
          }
          console.log(e)
        }
      } catch (e) {
        console.log(e)
      }
    },
    goToChooseNFT() {
      this.$store.dispatch('setStatus', this.Status.ChoosingParameters)
      this.$router.push({"name": 'ChooseNFT'})
    }
  },
  computed: {
    ...mapGetters({
      "provider": "getEthersProvider",
      "currentContract": "getCurrentContract",
      "getTokenPoolByContract": "getTokenPoolByContract",
      "statusId": "getStatus",
      "contracts": "getContractsWithChoices",
      "tokensForWrapping": "tokensForWrapping",
      "ipfs": "getIpfs",
      "bundleContractAddress": "getBundleContractAddress"
    }),
    tokenPool () {
      return this.getTokenPoolByContract(this.bundleContractAddress)
    },
    wrapButtonText () {
      if (this.statusId === this.Status.Minting) {
        return "Bundeling"
      } else {
        return "Bundle"
      }
    }
  },
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      if (!vm.$store.state.accountAddress) {
        vm.$router.push({name: 'Home'})
      }
    })
  }
}
</script>

<style scoped>

</style>
<template>
  <div class="container-fluid">
    <h1 class="pt-2 text-lilac">Unbundle your NFTs</h1>
    <b-row  class="justify-content-end pt-1 padding-div" style="min-height: 42px;" >
          <b-col class="col-2 align-items-center text-center">
            <b-button variant="dark" class="btn mr-2" @click="goToChooseNFT">Back</b-button>
          </b-col>
    </b-row>
    <token-deck card-size="standard"
                justification="justify-content-center" :contract-addresses="contracts"></token-deck>
    <b-row  class="justify-content-md-center">
        <b-col v-show="statusId === Status.Minting" class="col-1 text-black spinner-border" style="font-size: medium"></b-col>
    </b-row>
    <b-row  class="justify-content-md-center">
        <b-col v-show="statusId > Status.Minting" class="col-3 text-black text-center" style="font-size: large">Successfull unbundeled!</b-col>
    </b-row>
    <div class="row text-center align-content-center justify-content-center py-3">
      <div class="col-8">
        
        <b-button v-show="tokenPool.choices && statusId !== Status.Minted" @click="handleUnwrap"
           class="btn display-5 rounded-16 mr-2"
           :class="{disabled: statusId === Status.Minting}"
           variant="primary">
            {{ unwrapButtonText }} 
        </b-button>
        <b-button v-show="statusId !== Status.Minting && statusId !== Status.Minted" @click="$modal.show('send')"
           class="btn display-5 rounded-16 mr-2" variant="success" style="margin-left:10px;">Send</b-button>
        <!-- <b-button v-show="statusId === Status.Minted" @click="goToChooseNFT"
           class="btn bg-lilac display-5 text-white rounded-16">Go back to collection</b-button> -->
        <div v-show="statusId >= Status.Minting && transactionHash"
             class="container-fluid minting-panel bg-green rounded-16 mt-3">
            <p>View in explorer:</p>
            <div class="row h-100 align-items-center justify-content-center">
              <div class="col-12 align-self-center">
                <ChainBrowserLink css-class="link-gray"
                                  :hash="transactionHash"
                                  chain-name="ether"
                                  net-name="ropsten"
                                  :short="false"
                                  hash-kind="tx"/>
              </div>
          </div>
        </div>
      </div>
    </div>
    <modal name="send" :height="200">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLabel">Send bundeled token</h5>
          <button slot="top-right" type="button" class="close" data-dismiss="modal" @click="$modal.hide('send')"
                  aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <input v-model="toAddress" class="form-control" type="text" placeholder="Here goes the receiver's address">
        </div>
        <div class="modal-footer">
          <button @click="handleSendTo" type="button" class="btn bg-lilac text-white rounded-16"
                  :class="{disabled: !toAddress}">Send
          </button>
        </div>
      </div>
    </modal>
  </div>
</template>

<script>
import {mapActions, mapGetters} from "vuex";
import {sendWrappedTokenTo, unwrap} from "../ethereum_utils";
import TokenDeck from "../components/TokenDeck";
import ChainBrowserLink from "../components/ChainBrowserLink";
import {Status} from "../store";

export default {
  name: "Unwrap",
  components: {
    ChainBrowserLink,
    TokenDeck
  },
  data() {
    return {
      Status,
      transactionHash: null,
      toAddress: null,
      netName: process.env.VUE_APP_NET_NAME
    }
  },
  methods: {
    ...mapActions(['setStatus', 'removeOtherContracts', 'setWrappedTokenIds', "removeAllNFTS"]),
    async handleUnwrap() {
      try {
        this.setStatus(this.Status.Minting)
        try {
          let transactionResult = await unwrap(this.provider, this.tokenPool.choices[0], this.bundleContractAddress)
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
        }
      } catch (e) {
        console.log(e)
      }
    },
    goToChooseNFT() {
      this.$store.dispatch('setStatus', this.Status.ChoosingParameters)
      this.$router.push({"name": 'ChooseNFT'})
    },
    async handleSendTo() {
      await sendWrappedTokenTo(this.provider, await this.provider.getSigner().getAddress(), this.toAddress, this.tokenPool.choices[0], this.bundleContractAddress)
    }
  },
  computed: {
    ...mapGetters({
      "provider": "getEthersProvider",
      "currentContract": "getCurrentContract",
      "getTokenPoolByContract": "getTokenPoolByContract",
      "statusId": "getStatus",
      "contracts": "contractsExceptWrapped",
      "account": "getAccount",
      "bundleContractAddress": "getBundleContractAddress",
    }),
    tokenPool() {
      return this.getTokenPoolByContract(this.bundleContractAddress)
    },
    unwrapButtonText() {
      if (this.statusId === this.Status.Minting) {
        return "Unbundling"
      } else {
        return "Unbundle"
      }
    }
  },
  async beforeMount() {
    this.removeOtherContracts()
    await this.setWrappedTokenIds({bundleId: this.tokenPool.choices[0]})
  },
  beforeRouteEnter(to, from, next) {
    next((vm) => {
      if (!vm.$store.state.accountAddress) {
        vm.$router.push({name: 'ChooseNFT'})
      }
    })
  },
  beforeRouteLeave(to, from, next) {
    from;
    if (to.name === 'ChooseNFT') {
      this.removeOtherContracts()
      next()
    }
  }
}
</script>

<style scoped>

</style>
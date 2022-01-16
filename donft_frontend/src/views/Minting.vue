<template>
  <div class="container">
    <div class="row">
      <h1 class="pt-2 text-green">Bundle</h1>
      <b-row  class="justify-content-end pt-1 padding-div" style="min-height: 42px;" >
          <b-col class="col-2 align-items-center text-center">
            <b-button variant="dark" class="btn mr-2" @click="goToChooseNFT">Back</b-button>
          </b-col>
      </b-row>
      <div class="col-12 align-content-center text-center">
        <img :src="resultImage" alt="Your new NFT" :key="resultImage" class="resultImg img-thumbnail mb-3">
        <b-row  class="justify-content-md-center">
          <b-col v-show="statusId > Status.Minted" class="col-3 text-center text-black" style="font-size: medium">Successfull unbundeled!</b-col>
        </b-row>
        <b-row  class="justify-content-md-center">
          <b-col v-show="statusId >= Status.Minted" class="col-4 text-black" style="font-size: medium">Successfull minted!</b-col>
        </b-row>
        <div class="row text-center align-content-center justify-content-center">
          <div class="col-8">
            <p v-if="(statusId > Status.ChoosingParameters) && (statusId < Status.Minted)" class="text-lilac"><span class="display-5">{{ statusText }}</span>
            <div v-else-if="statusId === Status.Cancelled" class="btn-group rounded-16 pb-1" role="group" aria-label="Second group">
              <b-button variant="success" class="btn" @click="sendMintingTransaction">Continue minting</b-button>
            </div>
            <div v-show="statusId >= Status.Minting" class="container-fluid minting-panel bg-green rounded-16">
              <div class="row h-100 align-items-center justify-content-center">
                <div class="col-12 align-self-center">
                  <ChainBrowserLink v-if="statusId >= Status.Minting && transactionHash" css-class="link-gray"
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
    </div>
  </div>
</template>

<script>
import {mapGetters} from "vuex"
import {Status} from "../store";
import ChainBrowserLink from "../components/ChainBrowserLink";

export default {
  name: "Minting",
  components: {
    ChainBrowserLink
  },
  data() {
    return {
      Status,
      netName: process.env.VUE_APP_NET_NAME,
    }
  },
  async beforeMount() {
    await this.$store.dispatch('setResult')
    await this.$store.dispatch('setDeployedPictureMeta')
    await this.sendMintingTransaction()
  },
  methods: {
    async continueMint () {
      await this.sendMintingTransaction()
    },
    async sendMintingTransaction () {
      await this.$store.dispatch('setNFThash')
      if (this.transactionHash) {
        this.provider.once(this.transactionHash, (transaction) => {
          console.log(transaction)
          this.$store.dispatch('setStatus', this.Status.Minted)
        })
      }
    },
    goToChooseNFT() {
      this.$router.push({"name": 'ChooseNFT'})
    }
  },
  computed: {
    ...mapGetters({
      "statusId": "getStatus",
      "result": "getResult",
      "tokensForWrapping": "tokensForWrapping",
      "getTokenById": "getTokenById",
      "transactionHash": "getTransactionHash",
      "provider": "getEthersProvider"
    }),
    statusText() {
      switch (this.statusId) {
        case this.Status.Applying:
          return "Applying the chosen effect..."
        case this.Status.DeployingToIPFS:
          return "Uploading the result to IPFS..."
        case this.Status.Minting:
          return "Minting..."
        case this.Status.Minted:
          return "Minted!"
        default:
          return "Choose the Effect!"
      }
    },
    resultImage() {
      if (this.statusId > this.Status.DeployingToIPFS) {
        return this.result
      }
      return this.inputToken.localImage
    },
    inputToken() {
      const {token, tokenId} = this.tokensForWrapping[0]
      return this.getTokenById(token, String(tokenId))
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

.resultImg {
  height: 350px;
  width: auto;
}

.mnt {
  position: absolute;
  left: 0px;
  right: 0px;
  top: 0px;
  bottom: 0px;

  background: #FFFFFF;
  border-radius: 16px;
}
</style>
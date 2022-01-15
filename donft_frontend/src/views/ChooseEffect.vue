<template>
  <div class="container-fluid">
    <h1 class="pt-2 text-lilac">Choose modification</h1>
    <b-row  class="justify-content-end pt-1 padding-div" style="min-height: 42px;" >
          <b-col class="col-2 align-items-center text-center">
            <b-button variant="dark" class="btn mr-2" @click="goToChooseNFT">Back</b-button>
          </b-col>
    </b-row>
    <!-- <div class="container"> -->
      <p>Chosen NFT:</p>
      <div class="row justify-content-center">
        <div class="col-auto">
          <token-card :contract-address="contract"
                      :is-choosable="false"
                      :is-chosen="false"
                      :token-id="chosenNFTid"
                      card-size="standart"/>
        </div>
      </div>
    <!-- </div> -->
    <b-row>
      <b-col>
          <p>Choose a effect to continue:</p>
          <CardDeck content-type="video" :show-id="false" :cards="getEffects" :choice="[getEffectChoice]"
              @cardClicked="chooseEffect" card-size="smaller"
              justification="justify-content-center"></CardDeck>
      </b-col>
    </b-row>
    
    <div class="row justify-content-center py-3">
      <div class="col-auto">
        <b-button ref="mintBtn" v-show="chosenNFTid && (getEffectChoice !== null)" @click="handleMint"
           class="btn display-5" variant="success">Mint</b-button>
      </div>

    </div>
  </div>
</template>

<script>
import CardDeck from "../components/CardDeck";
import {mapGetters} from "vuex";
import TokenCard from "../components/TokenCard";

export default {
  name: "ChooseEffect",
  components: {
    TokenCard,
    CardDeck
  },
  methods: {
    scrollToMintButton() {
      const el = this.$refs.mintBtn;

      if (el) {
        el.scrollIntoView({behavior: 'smooth'});
      }
    },
    async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    async chooseEffect(id) {
      this.$store.dispatch('setEffectChoice', id)
      await this.sleep(5)
      this.scrollToMintButton()

    },
    goToChooseNFT() {
      this.$router.push({"name": 'ChooseNFT'})
    },
    handleMint() {
      this.$router.push({'name': 'Minting'})
    }
  },
  computed: {
    ...mapGetters([
      'getEffectChoice',
      'getEffects',
      'getCurrentContract',
      'getTokenPoolByContract',
      'getContractsWithChoices'
    ]),
    chosenNFTid() {
      return this.getTokenPoolByContract(this.contract).choices[0]
    },
    contract () {
      return this.getContractsWithChoices[0]
    }
  },
  async beforeMount() {
    await this.$store.dispatch("setEffects")
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
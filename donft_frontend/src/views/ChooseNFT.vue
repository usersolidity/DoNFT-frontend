<template>
<div >
  <b-tabs fill>
     <b-tab title="My NFTs" active>
       <div class="container-fluid">
        <b-row  class="justify-content-end pt-1 padding-div" style="min-height: 42px;" >
          <b-col class="col-4 align-items-center text-center">
            <b-button variant="success" v-show="numChoices > 1" class="btn mr-2" @click="$router.push({name: 'WrapNFTS'})">Bundle</b-button>
            <b-button variant="success" @click="$router.push({'name': 'ChooseEffect'})" v-show="effectsEnabled && numChoices === 1" class="btn text-white">Apply Effect</b-button>
            <b-button variant="dark" v-show="numChoices > 1" class="btn mr-2" @click="clearChoices" style="margin-left:10px;">Clear selection</b-button>
          </b-col>
        </b-row>
        <b-row>
          <b-col class="padding-div">
            <token-deck @tokenClicked="chooseNFT" card-size="standard" justification="justify-content-left" :contract-addresses="contractsExceptWrapped"/>
          </b-col>
        </b-row>
       </div>
     </b-tab>
     <b-tab title="Bundled NFTs">
       <div class="container-fluid">
        <b-row  class="justify-content-end pt-1 padding-div" style="min-height: 42px;" >
        </b-row>
        <b-row>
          <b-col class="padding-div">
            <token-deck @tokenClicked="chooseBundle" card-size="standard" justification="justify-content-left" :contract-addresses="[wrappedContractAddress]"/>
          </b-col>
        </b-row>
       </div>
     </b-tab>
  </b-tabs>
</div>
</template>

<script>
import {mapGetters, mapActions} from "vuex";
import TokenDeck from "../components/TokenDeck";
export default {
  name: "ChooseNFT",
  components: {
    TokenDeck
  },
  data () {
    return {
      wrappedContractAddress: process.env.VUE_APP_BUNDLE_CONTRACT_ADDRESS,
      tab: 'wrapped',
      effectsEnabled: process.env.VUE_APP_EFFECTS_ENABLED === 'true'
    }
  },
  computed: {
    ...mapGetters([
        'getTokenPoolByContract',
        'getCurrentContract',
        'contractsExceptWrapped',
        'numChoices'
    ])
  },
  methods: {
    ...mapActions([
        'setNFTchoices',
        'clearOtherChoices',
        'setCurrentContractAddress'
    ]),
    clearChoices () {
      this.clearOtherChoices({contractAddress: null})
    },
    chooseNFT ({id, contractAddress}) {
      let tokenPool = this.getTokenPoolByContract(contractAddress)
      let newChoice = []
      if (contractAddress === this.wrappedContractAddress) {
        newChoice.push(id)
      } else {
        newChoice = [...tokenPool.choices]
        let choiceIdx = newChoice.indexOf(id)
        if (choiceIdx > -1) {
          newChoice.splice(choiceIdx, 1)
        } else {
          newChoice.push(id)
        }
      }
      this.setNFTchoices({contractAddress, choices: newChoice})
    },
    chooseBundle({id, contractAddress}) {
      this.chooseNFT({id, contractAddress})
      this.$router.push({name: 'Unwrap'})
    }
  },
  beforeRouteEnter(to, from, next) {
    next(async (vm) => {
      if (!vm.$store.state.accountAddress) {
        vm.$router.push({name: 'Home'})
      }
      await Promise.all([vm.$store.dispatch('setUserTokenIds'),
        vm.$store.dispatch('setNFTS', {contractAddress: process.env.VUE_APP_BUNDLE_CONTRACT_ADDRESS})])
    })
  },

}
</script>

<style scoped>

</style>
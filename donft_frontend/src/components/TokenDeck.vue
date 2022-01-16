<template>
  <div class="row" :class="justification">
    <div v-for="token in tokens" class="col-auto pt-2 pb-3" :key="token.contractAddress + ':' + token.id">
      <token-card
          @cardClicked="$emit('tokenClicked', {id: token.id, contractAddress: token.contractAddress})"
          :card-size="cardSize" :token-id="token.id"
          :contract-address="token.contractAddress"
          :is-choosable="choiceKind !== 'none'"
          :is-chosen="getTokenPoolByContract(token.contractAddress) && getTokenPoolByContract(token.contractAddress).choices.indexOf(token.id) !== -1"/>
    </div>
    <div v-if="tokens && tokens.length < 1" class="col-auto pt-2 pb-3">
        You don't have any NFTs.
    </div>
  </div>
</template>

<script>
import TokenCard from "./TokenCard";
import {mapGetters} from "vuex";
export default {
  name: "TokenDeck",
  components: {
    TokenCard
  },
  props: ['contractAddresses', 'justification', 'cardSize', 'choiceKind', 'showChosenOnly'],
  computed: {
    ...mapGetters([
        'getTokenPoolByContract'
    ]),
    tokenPools () {
      let pools = []
      for (const contractAddress of this.contractAddresses) {
        pools.push(this.getTokenPoolByContract(contractAddress))
      }
      return pools
    },
    tokens () {
      let tokenArray = []
      for (const [idx, pool] of this.tokenPools.entries()) {
        if (pool) {
          if (!this.showChosenOnly) {
            tokenArray.push(...this.tokenPools[idx].tokens.map(x => ({...x, contractAddress: pool.contractAddress})))
          } else {
            let filtered = this.tokenPools[idx].tokens.filter((x) => this.tokenPools[idx].choices.indexOf(x.id) !== -1)
            let mapped = filtered.map(x => ({...x, contractAddress: pool.contractAddress}))
            tokenArray.push(...mapped)
          }
        }
      }
      return tokenArray
    }
  }

}
</script>

<style scoped>

</style>